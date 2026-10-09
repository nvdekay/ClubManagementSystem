import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { FEEDBACK_CRITERION, type EventFeedbackRepository, type MyEventFeedback } from "../../domain/event-feedback.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid feedback date in database");
  return value;
}

function rating(scores: unknown): number {
  const overall = Array.isArray(scores)
    ? scores.find((item) => item && typeof item === "object" && (item as Doc).criterionCode === FEEDBACK_CRITERION)
    : undefined;
  return Number((overall as Doc | undefined)?.score ?? 0);
}

function map(feedback: Doc, event: Doc): MyEventFeedback {
  return { id: String(feedback._id), eventId: String(feedback.eventId), eventTitle: String(event.title),
    clubName: String(event.clubName ?? ""), rating: rating(feedback.scores),
    comment: typeof feedback.comment === "string" ? feedback.comment : "",
    isAnonymous: feedback.isAnonymous === true, submittedAt: date(feedback.submittedAt) };
}

export function mongoEventFeedbackRepository(): EventFeedbackRepository {
  const events = ucmsModels.events!;
  const attendances = ucmsModels.attendances!;
  const feedbacks = ucmsModels.eventFeedbacks!;
  const audits = ucmsModels.auditLogs!;

  return {
    async target(eventId, studentId) {
      const eventObjectId = new Types.ObjectId(eventId);
      const studentObjectId = new Types.ObjectId(studentId);
      const event = await events.findById(eventObjectId).lean();
      if (!event) return null;
      const [attendance, feedback] = await Promise.all([
        attendances.findOne({ eventId: eventObjectId, studentId: studentObjectId }).lean(),
        feedbacks.findOne({ eventId: eventObjectId, studentId: studentObjectId }).lean(),
      ]);
      return {
        attendance: attendance ? { id: String(attendance._id), clubId: String(attendance.clubId),
          checkedInAt: date(attendance.checkedInAt), eventEndAt: date(event.endAt) } : null,
        feedback: feedback ? map(feedback, event) : null,
      };
    },

    async submit(input) {
      const studentId = new Types.ObjectId(input.studentId);
      let id: Types.ObjectId | undefined;
      try {
        await mongoose.connection.transaction(async (session) => {
          const [doc] = await feedbacks.create([{ eventId: new Types.ObjectId(input.eventId),
            attendanceId: new Types.ObjectId(input.attendanceId), studentId,
            clubId: new Types.ObjectId(input.clubId),
            scores: [{ criterionCode: FEEDBACK_CRITERION, score: input.rating }],
            comment: input.comment, isAnonymous: input.isAnonymous, submittedAt: input.now }], { session });
          id = doc!._id as Types.ObjectId;
          // The audit trail records that feedback exists, never its content (BR37, A1).
          await audits.create([{ entityType: "EventFeedback", entityId: id, action: "EVENT_FEEDBACK_SUBMITTED",
            actorId: studentId, actorRole: "STUDENT", after: { eventId: input.eventId, isAnonymous: input.isAnonymous },
            correlationId: randomUUID(), at: input.now }], { session });
        });
      } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
          throw new DomainError("feedback was already submitted for this event", "conflict");
        }
        throw error;
      }
      const [feedback, event] = await Promise.all([feedbacks.findById(id).lean(),
        events.findById(new Types.ObjectId(input.eventId)).lean()]);
      if (!feedback || !event) throw new DomainError("feedback not found after submission", "not_found");
      return map(feedback, event);
    },

    async listMine(studentId) {
      const docs = await feedbacks.find({ studentId: new Types.ObjectId(studentId) })
        .sort({ submittedAt: -1, _id: -1 }).lean();
      const eventDocs = await events.find({ _id: { $in: docs.map((doc) => doc.eventId) } }).lean();
      const byId = new Map(eventDocs.map((event) => [String(event._id), event]));
      return docs.flatMap((doc) => {
        const event = byId.get(String(doc.eventId));
        return event ? [map(doc, event)] : [];
      });
    },
  };
}
