import { z } from "zod";
import { notificationInboxQuery } from "../../usecase/notification.js";

const itemPath = z.object({ id: z.string() });
const responses = { "200": { description: "Operation completed" }, "400": { description: "Invalid request" },
  "401": { description: "Authentication required" }, "404": { description: "Notification not found" } };

/** NTF-04 in-app inbox of the signed-in user. */
export const notificationOpenApiPaths = {
  "/notifications/mine": { get: { summary: "NTF-04 current user's notifications, newest first (cursor `before` = nextBefore)",
    requestParams: { query: notificationInboxQuery }, responses } },
  "/notifications/mine/unread-count": { get: { summary: "NTF-04 number of unread notifications", responses } },
  "/notifications/mine/read-all": { post: { summary: "NTF-04 mark every notification read (CSRF required)", responses } },
  "/notifications/{id}/read": { post: { summary: "NTF-04 mark one own notification read (CSRF required)",
    requestParams: { path: itemPath }, responses } },
};
