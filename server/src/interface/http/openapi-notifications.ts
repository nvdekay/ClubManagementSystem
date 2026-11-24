import { z } from 'zod'
import { notificationInboxQuery, notificationScopeQuery } from '../../usecase/notification.js'

const itemPath = z.object({ id: z.string() })
const responses = {
  '200': { description: 'Operation completed' },
  '400': { description: 'Invalid request' },
  '401': { description: 'Authentication required' },
  '404': { description: 'Notification not found' },
}

/**
 * NTF-04 inbox trong app của user đang đăng nhập. `scope` (student | icpdp | club) giữ thông báo của
 * một workspace, và `clubId` (chỉ với scope=club) thu hẹp về một CLB; không có `scope` thì trả tất cả.
 */
export const notificationOpenApiPaths = {
  '/notifications/mine': {
    get: {
      summary:
        "NTF-04 current user's notifications, newest first (cursor `before` = nextBefore; optional scope/clubId)",
      requestParams: { query: notificationInboxQuery },
      responses,
    },
  },
  '/notifications/mine/unread-count': {
    get: {
      summary: 'NTF-04 number of unread notifications (optional scope/clubId)',
      requestParams: { query: notificationScopeQuery },
      responses,
    },
  },
  '/notifications/mine/read-all': {
    post: {
      summary: 'NTF-04 mark every notification read, or those of one scope (CSRF required)',
      requestParams: { query: notificationScopeQuery },
      responses,
    },
  },
  '/notifications/{id}/read': {
    post: {
      summary: 'NTF-04 mark one own notification read (CSRF required)',
      requestParams: { path: itemPath },
      responses,
    },
  },
}
