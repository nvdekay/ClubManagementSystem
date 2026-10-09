import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type {
  FeedbackCategory,
  FeedbackRecipient,
  ReceivedFeedback,
  SentFeedback,
  StudentFeedbackRepository,
} from "../../domain/student-feedback.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid feedback date in database");
  return value;
}

export function mongoStudentFeedbackRepository(): StudentFeedbackRepository {
  const complaints = ucmsModels.complaints!;
  const clubs = ucmsModels.clubs!;
  const events = ucmsModels.events!;
  const users = ucmsModels.users!;
  const audits = ucmsModels.auditLogs!;

  /** Resolves club and event names in two queries for a whole page of feedback. */
  async function withNames(docs: Doc[]): Promise<SentFeedback[]> {
    const clubIds = docs.flatMap((doc) => (doc.clubId ? [doc.clubId] : []));
    const eventIds = docs.flatMap((doc) => (doc.eventId ? [doc.eventId] : []));
    const [clubDocs, eventDocs] = await Promise.all([
      clubIds.length ? clubs.find({ _id: { $in: clubIds } }).select({ name: 1 }).lean() : [],
      eventIds.length ? events.find({ _id: { $in: eventIds } }).select({ title: 1 }).lean() : [],
    ]);
    const clubName = new Map(clubDocs.map((club) => [String(club._id), String(club.name)]));
    const eventTitle = new Map(eventDocs.map((event) => [String(event._id), String(event.title)]));
    return docs.map((doc) => ({ id: String(doc._id), recipient: doc.recipient as FeedbackRecipient,
      ...(doc.clubId ? { clubId: String(doc.clubId), clubName: clubName.get(String(doc.clubId)) ?? "" } : {}),
      ...(doc.eventId ? { eventId: String(doc.eventId), eventTitle: eventTitle.get(String(doc.eventId)) ?? "" } : {}),
      category: doc.type as FeedbackCategory, message: String(doc.description),
      isAnonymous: doc.isAnonymous === true, submittedAt: date(doc.submittedAt) }));
  }

  return {
    async club(clubId) {
      const club = await clubs.findById(new Types.ObjectId(clubId)).select({ name: 1, state: 1 }).lean();
      return club ? { id: String(club._id), name: String(club.name), state: String(club.state) } : null;
    },

    async eventBelongsToClub(eventId, clubId) {
      return Boolean(await events.exists({ _id: new Types.ObjectId(eventId), clubId: new Types.ObjectId(clubId) }));
    },

    async submit(input) {
      const studentId = new Types.ObjectId(input.studentId);
      let created: Doc | undefined;
      await mongoose.connection.transaction(async (session) => {
        const [doc] = await complaints.create([{ complainantId: studentId, recipient: input.recipient,
          ...(input.clubId ? { clubId: new Types.ObjectId(input.clubId) } : {}),
          ...(input.eventId ? { eventId: new Types.ObjectId(input.eventId) } : {}),
          type: input.category, description: input.message, isAnonymous: input.isAnonymous,
          state: "Submitted", submittedAt: input.now }], { session });
        created = doc!.toObject() as Doc;
        // The audit notes that feedback was sent and to whom, never its content.
        await audits.create([{ entityType: "Complaint", entityId: doc!._id, action: "STUDENT_FEEDBACK_SENT",
          actorId: studentId, actorRole: "STUDENT",
          after: { recipient: input.recipient, clubId: input.clubId, isAnonymous: input.isAnonymous },
          correlationId: randomUUID(), at: input.now }], { session });
      });
      return (await withNames([created!]))[0]!;
    },

    async listMine(studentId) {
      const docs = await complaints.find({ complainantId: new Types.ObjectId(studentId) })
        .sort({ submittedAt: -1, _id: -1 }).lean();
      return withNames(docs);
    },

    async inbox(recipient, clubId) {
      const docs = await complaints.find({ recipient,
        ...(clubId ? { clubId: new Types.ObjectId(clubId) } : {}) }).sort({ submittedAt: -1, _id: -1 }).limit(200).lean();
      const named = await withNames(docs);
      // Anonymous senders are never looked up, so their identity cannot leak to the reader.
      const senderIds = docs.flatMap((doc) => (doc.isAnonymous === true ? [] : [doc.complainantId]));
      const senders = senderIds.length
        ? await users.find({ _id: { $in: senderIds } }).select({ displayName: 1, email: 1 }).lean() : [];
      const byId = new Map(senders.map((user) => [String(user._id),
        { displayName: String(user.displayName), email: String(user.email) }]));
      return named.map((item, index): ReceivedFeedback => {
        const sender = docs[index]!.isAnonymous === true ? undefined : byId.get(String(docs[index]!.complainantId));
        return sender ? { ...item, sender } : item;
      });
    },
  };
}
