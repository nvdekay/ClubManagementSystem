// Tiêu đề phụ trong một nhóm chính sách
export function PolicySubHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-semibold">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-muted-app">{hint}</p>}
    </div>
  )
}
