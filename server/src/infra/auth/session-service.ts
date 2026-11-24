import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { SessionRepository, SessionService } from '../../domain/session.js'

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

// Băm SHA-256 một chuỗi để lưu token phiên dạng hash
function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// So sánh hai chuỗi theo thời gian hằng số để tránh timing attack
function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

// Tạo service phiên đăng nhập: cấp, xác thực, thu hồi session và CSRF token
export function createSessionService(repo: SessionRepository, secret: string): SessionService {
  function signature(token: string): string {
    return createHmac('sha256', secret).update(`session:${token}`).digest('base64url')
  }

  function csrfToken(token: string): string {
    return createHmac('sha256', secret).update(`csrf:${token}`).digest('base64url')
  }

  function verify(cookieValue: string | undefined): string | null {
    if (!cookieValue) {
      return null
    }
    const [token, mac, extra] = cookieValue.split('.')
    if (extra !== undefined || !token || !mac || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return null
    }
    return safeEqual(mac, signature(token)) ? token : null
  }

  return {
    // Cấp phiên mới (hạn 7 ngày), lưu hash token và trả cookie cùng CSRF token
    async issue(userId, now) {
      const token = randomBytes(32).toString('base64url')
      const csrf = csrfToken(token)
      const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS)
      await repo.create({ userId, tokenHash: hash(token), csrfHash: hash(csrf), expiresAt })
      return { cookieValue: `${token}.${signature(token)}`, csrfToken: csrf, expiresAt }
    },
    // Tìm phiên còn hiệu lực theo cookie và trả kèm CSRF token
    async resolve(cookieValue, now) {
      const token = verify(cookieValue)
      if (!token) {
        return null
      }
      const session = await repo.findActive(hash(token), now)
      if (!session) {
        return null
      }
      const csrf = csrfToken(token)
      return safeEqual(session.csrfHash, hash(csrf)) ? { session, csrfToken: csrf } : null
    },
    // Thu hồi phiên của cookie hiện tại (đăng xuất)
    async revoke(cookieValue, now) {
      const token = verify(cookieValue)
      if (token) {
        await repo.revoke(hash(token), now)
      }
    },
    // Thu hồi mọi phiên của một người dùng
    async revokeUser(userId, now) {
      await repo.revokeUser(userId, now)
    },
  }
}
