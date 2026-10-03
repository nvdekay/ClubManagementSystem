import { Types } from "mongoose";
import {
  GRANTABLE_CLUB_PERMISSIONS, LEADER_ONLY_CLUB_PERMISSIONS, normalizeAllowedGoogleEmail,
} from "../../domain/access.js";
import type { AuthConfig } from "../config/index.js";
import { ucmsModels } from "./ucms-models.js";

const SYSTEM_ROLE_CODES = ["ICPDP_OFFICER", "ICPDP_HEAD", "ATTENDANCE_UNLOCK"] as const;
const PERMISSION_MODULES: Record<string, string> = {
  "club.profile.manage": "M02",
  "club.recruitment.manage": "M04",
  "club.application.review": "M04",
  "club.member.manage": "M04",
  "club.event.manage": "M05",
  "club.attendance.manage": "M06",
  "club.report.submit": "M08",
  "club.expense.record": "M07",
  "club.booking.manage": "M11",
  "club.feedback.view": "M12",
  "club.complaint.respond": "M12",
  "club.role.manage": "M03",
  "club.board.nominate": "M03",
  "club.transition.plan": "M03",
  "club.suspension.request": "M02",
};

export async function ensureAuthBootstrap(config: AuthConfig): Promise<void> {
  const email = normalizeAllowedGoogleEmail(
    config.BOOTSTRAP_ICPDP_EMAIL, true, [config.ALLOWED_DOMAIN],
  );
  const roles = ucmsModels.roles!;
  const users = ucmsModels.users!;
  const assignments = ucmsModels.userRoleAssignments!;
  const permissions = ucmsModels.permissions!;

  await assignments.collection.createIndex(
    { userId: 1, roleId: 1 },
    { unique: true, name: "uq_ura_active", partialFilterExpression: { revokedAt: null } },
  );

  for (const code of [...GRANTABLE_CLUB_PERMISSIONS, ...LEADER_ONLY_CLUB_PERMISSIONS]) {
    await permissions.updateOne({ code }, { $setOnInsert: {
      code, name: code, module: PERMISSION_MODULES[code], scope: "club",
      isLeaderReserved: LEADER_ONLY_CLUB_PERMISSIONS.some((reserved) => reserved === code),
    } }, { upsert: true });
  }

  for (const code of SYSTEM_ROLE_CODES) {
    await roles.updateOne({ code }, { $setOnInsert: {
      code, name: code.replaceAll("_", " "), scope: "system",
      permissionCodes: [], isSystem: true,
    } }, { upsert: true });
  }
  const officerRole = await roles.findOne({ code: "ICPDP_OFFICER", scope: "system", isSystem: true });
  if (!officerRole) throw new Error("ICPDP_OFFICER role has invalid scope");

  await users.updateOne({ email }, { $setOnInsert: {
    email, displayName: email, accountState: "Active", createdAt: new Date(),
  } }, { upsert: true });
  const officer = await users.findOne({ email });
  if (!officer) throw new Error("bootstrap officer account was not created");

  const assignment = await assignments.findOne({ userId: officer._id, roleId: officerRole._id });
  if (!assignment) {
    await assignments.create({
      userId: officer._id, roleId: officerRole._id,
      grantedBy: new Types.ObjectId(String(officer._id)), grantedAt: new Date(),
      reason: "initial bootstrap",
    });
  }
}
