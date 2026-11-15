import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppIcon } from "@/components/ui/icon/AppIcon";
import { cn } from "@/utils/cn";

export interface DashboardTask {
  key: string;
  label: string;
  /** `undefined` khi panel tải lỗi. */
  count?: number;
  href?: string;
}

interface DashboardTaskListProps {
  title: string;
  description: string;
  tasks: DashboardTask[];
  /** `neutral` liệt kê các tổng số thường, bấm vào mở danh sách bản ghi; không có mục nào quá hạn. */
  variant?: "attention" | "neutral";
}

// Danh sách việc cần xử lý trên dashboard, kèm số lượng từng việc
/** Các dòng trạng thái cho việc quá hạn hoặc còn nợ: icon và con số thể hiện trạng thái, không chỉ dựa vào màu. */
export function DashboardTaskList({ title, description, tasks, variant = "attention" }: DashboardTaskListProps) {
  const { t } = useTranslation();
  const neutral = variant === "neutral";
  const open = tasks.filter((task) => (task.count ?? 0) > 0);
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h3 className="font-heading text-base font-semibold text-text-app">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-app">{description}</p>
      {!neutral && !open.length && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-mint-soft-app px-3 py-2.5 text-sm font-medium text-success-app">
          <AppIcon name="check" className="size-4" />{t("dashboard.allClear")}
        </p>
      )}
      <ul className="mt-3 divide-y divide-border-app">
        {tasks.map((task) => {
          const due = !neutral && (task.count ?? 0) > 0;
          const body = (
            <>
              <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app",
                { "border-transparent bg-danger-app/10 text-danger-app": due })}>
                <AppIcon name={neutral ? "chevronRight" : due ? "alert" : "check"} className="size-4" />
              </span>
              <span className={cn("min-w-0 flex-1 text-sm break-words text-muted-app", { "font-medium text-text-app": due || neutral })}>{task.label}</span>
              <span className={cn("text-sm font-semibold text-muted-app tabular-nums", { "text-danger-app": due, "text-text-app": neutral })}>
                {task.count === undefined ? "–" : task.count}
              </span>
            </>
          );
          const className = "flex items-center gap-3 rounded-lg px-1 py-2.5";
          return (
            <li key={task.key}>
              {task.href && (due || neutral) ? <Link to={task.href} className={cn(className, "transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app")}>{body}</Link>
                : <div className={className}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
