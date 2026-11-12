import type { AppIconName } from "@/components/ui/icon/AppIcon";
import type { Workspace } from "@/services/auth";

/**
 * One icon per workspace, shared by the workspace picker and the sidebar: club boards (leader, founder)
 * get a briefcase, plain club members an ID card, so two club cards never look identical.
 */
export function workspaceIcon(kind: Workspace["kind"], role?: Workspace["role"]): AppIconName {
  if (kind === "student") return "graduationCap";
  if (kind === "icpdp") return "shield";
  return role && role !== "leader" && role !== "founder" ? "idCard" : "briefcase";
}
