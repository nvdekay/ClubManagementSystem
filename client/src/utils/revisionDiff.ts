/** Một trường khác nhau giữa hai phiên bản đã nộp, đã được chuyển thành văn bản. */
export interface FieldChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

/** Cách đọc và gắn nhãn một trường được so sánh của snapshot. */
export interface DiffField<T> {
  key: string;
  label: string;
  read: (snapshot: T) => string;
}

// So sánh hai phiên bản và trả về các trường thay đổi
/** Các trường có văn bản hiển thị khác nhau giữa hai snapshot, theo thứ tự đã cho. */
export function diffFields<T>(before: T, after: T, fields: readonly DiffField<T>[]): FieldChange[] {
  return fields.flatMap((field) => {
    const old = field.read(before).trim();
    const now = field.read(after).trim();
    return old === now ? [] : [{ key: field.key, label: field.label, before: old, after: now }];
  });
}
