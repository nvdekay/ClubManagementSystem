import { z } from "zod";
import { notificationInboxQuery, notificationScopeQuery } from "../../usecase/notification.js";

const itemPath = z.object({ id: z.string() });
const responses = { "200": { description: "Operation completed" }, "400": { description: "Invalid request" },
  "401": { description: "Authentication required" }, "404": { description: "Notification not found" } };

/**
 * NTF-04 in-app inbox of the signed-in user. `scope` (student | icpdp | club) keeps the notifications of
 * one workspace, and `clubId` (only with scope=club) narrows it to one club; without `scope`, all of them.
 */
export const notificationOpenApiPaths = {
  "/notifications/mine": { get: { summary: "NTF-04 current user's notifications, newest first (cursor `before` = nextBefore; optional scope/clubId)",
    requestParams: { query: notificationInboxQuery }, responses } },
  "/notifications/mine/unread-count": { get: { summary: "NTF-04 number of unread notifications (optional scope/clubId)",
    requestParams: { query: notificationScopeQuery }, responses } },
  "/notifications/mine/read-all": { post: { summary: "NTF-04 mark every notification read, or those of one scope (CSRF required)",
    requestParams: { query: notificationScopeQuery }, responses } },
  "/notifications/{id}/read": { post: { summary: "NTF-04 mark one own notification read (CSRF required)",
    requestParams: { path: itemPath }, responses } },
};
