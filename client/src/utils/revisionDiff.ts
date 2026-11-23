/** One field that differs between two submitted versions, already rendered as text. */
export interface FieldChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

/** How to read and label one compared field of a snapshot. */
export interface DiffField<T> {
  key: string;
  label: string;
  read: (snapshot: T) => string;
}

/** Fields whose rendered text differs between the two snapshots, in the order given. */
export function diffFields<T>(before: T, after: T, fields: readonly DiffField<T>[]): FieldChange[] {
  return fields.flatMap((field) => {
    const old = field.read(before).trim();
    const now = field.read(after).trim();
    return old === now ? [] : [{ key: field.key, label: field.label, before: old, after: now }];
  });
}
