import type { AppIconName } from "@/components/ui/icon/AppIcon";
import type { Workspace } from "@/services/auth";

/** One icon per workspace kind, shared by the workspace picker and the sidebar. */
export function workspaceIcon(kind: Workspace["kind"]): AppIconName {
  if (kind === "student") return "graduationCap";
  if (kind === "icpdp") return "shield";
  return "briefcase";
}
