import { Router } from 'express'
import type { NotificationRepository } from '../../domain/notification.js'
import {
  markAllNotificationsRead,
  markNotificationRead,
  myNotifications,
  myUnreadNotificationCount,
} from '../../usecase/notification.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor } from './request.js'

// Mount các route hộp thư thông báo của người dùng
export function notificationRoutes(
  deps: SessionDeps & {
    repo: NotificationRepository
  },
): Router {
  const r = Router()
  const { read, write } = guards(deps)
  // Liệt kê thông báo của tôi
  r.get('/notifications/mine', read, async (req, res) => {
    ok(res, await myNotifications(deps.repo, actor(res), req.query))
  })
  // Lấy số thông báo chưa đọc
  r.get('/notifications/mine/unread-count', read, async (req, res) => {
    ok(res, await myUnreadNotificationCount(deps.repo, actor(res), req.query))
  })
  // Đánh dấu tất cả thông báo là đã đọc
  r.post('/notifications/mine/read-all', write, async (req, res) => {
    ok(res, await markAllNotificationsRead(deps.repo, actor(res), new Date(), req.query))
  })
  // Đánh dấu một thông báo là đã đọc
  r.post('/notifications/:id/read', write, async (req, res) => {
    ok(res, await markNotificationRead(deps.repo, actor(res), String(req.params.id), new Date()))
  })
  return r
}
