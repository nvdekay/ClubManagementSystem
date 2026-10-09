export type EventRegistrationState = "Confirmed" | "Waitlisted" | "Cancelled";
export type EventRegistrationAnswer = string | string[];

export interface EventRegistrationFormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
}

export interface EventRegistration {
  id: string;
  eventId: string;
  studentId: string;
  clubId: string;
  clubName: string;
  eventTitle: string;
  eventStartAt: Date;
  eventEndAt: Date;
  /** UC31 window the student can check in during (event's configured window, else its start/end). */
  checkInOpensAt: Date;
  checkInClosesAt: Date;
  state: EventRegistrationState;
  waitlistPosition?: number;
  answers: Record<string, EventRegistrationAnswer>;
  createdAt: Date;
  cancelledAt?: Date;
}

export interface EventRegistrationContext {
  event: {
    id: string;
    clubId: string;
    clubName: string;
    title: string;
    state: string;
    audienceScope: string;
    startAt: Date;
    endAt: Date;
    registrationOpenAt?: Date;
    registrationCloseAt?: Date;
    capacity: number;
    confirmedRegistrationCount: number;
    waitlistEnabled: boolean;
  };
  formSchema: EventRegistrationFormField[];
  isActiveClubMember: boolean;
  registration: EventRegistration | null;
}

export interface EventRegistrationRepository {
  context(eventId: string, studentId: string): Promise<EventRegistrationContext | null>;
  listMine(studentId: string): Promise<EventRegistration[]>;
  findOwned(registrationId: string, studentId: string): Promise<EventRegistration | null>;
  register(input: { eventId: string; studentId: string;
    answers: Record<string, EventRegistrationAnswer>; allowOverbooking: boolean;
    now: Date }): Promise<EventRegistration>;
  cancel(registrationId: string, studentId: string, now: Date): Promise<EventRegistration>;
}

export function validateEventRegistrationAnswers(
  fields: readonly EventRegistrationFormField[],
  answers: Readonly<Record<string, EventRegistrationAnswer>>,
): Record<string, EventRegistrationAnswer> {
  const known = new Set(fields.map((field) => field.key));
  if (Object.keys(answers).some((key) => !known.has(key))) {
    throw new Error("registration contains an unknown answer");
  }
  const result: Record<string, EventRegistrationAnswer> = {};
  for (const field of fields) {
    const raw = answers[field.key];
    const values = Array.isArray(raw) ? raw.map((value) => value.trim())
      : typeof raw === "string" ? [raw.trim()] : [];
    const present = values.some(Boolean);
    if (field.required && !present) throw new Error(`registration answer is required: ${field.key}`);
    if (!present) continue;
    if (values.length > 30 || values.some((value) => value.length > 2_000)) {
      throw new Error(`registration answer is invalid: ${field.key}`);
    }
    if (field.type !== "checkbox" && values.length !== 1) {
      throw new Error(`registration answer must be singular: ${field.key}`);
    }
    if ((field.type === "select" || field.type === "radio" || field.type === "checkbox")
      && values.some((value) => !field.options?.includes(value))) {
      throw new Error(`registration answer is outside the allowed options: ${field.key}`);
    }
    result[field.key] = field.type === "checkbox" ? values : values[0]!;
  }
  return result;
}
