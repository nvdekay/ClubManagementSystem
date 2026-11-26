import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// Builds a Content-Security-Policy header value from directive -> sources.
function policy(directives: Record<string, readonly string[]>): string {
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(' '))
    .join('; ')
}

/**
 * What the built client loads (client/index.html, client/proposal-preview.html):
 * - scripts: only its own hashed bundles; nothing inline, no eval.
 * - styles: its own CSS, the Google Fonts stylesheet, and inline <style> tags injected at runtime
 *   by libraries (sonner toasts; docx-preview inside the proposal preview frame).
 * - fonts: Google Fonts files, plus data:/blob: fonts that docx-preview extracts from a DOCX.
 * - images: club logos, covers and avatars are stored as arbitrary https URLs (Cloudinary, Google
 *   profile photos, the campus banner), and previews use data:/blob: URLs.
 * - connect: the same-origin API, plus Cloudinary for downloading periodic-report evidence.
 * - frames: the same-origin proposal preview page, or a blob: URL for an uploaded PDF. The PDF
 *   viewer document inherits this policy, so object-src must allow blob: for it to render.
 */
const APP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'data:', 'blob:', 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://res.cloudinary.com'],
  'frame-src': ["'self'", 'blob:'],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ['blob:'],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
} as const

/** Policy for every response except the pages below: the SPA and the JSON API. */
export const APP_CSP = policy(APP_DIRECTIVES)

/** The proposal preview page is embedded by the SPA in a same-origin iframe. */
export const FRAMEABLE_APP_CSP = policy({ ...APP_DIRECTIVES, 'frame-ancestors': ["'self'"] })

/** Pages the client frames itself; they get SAMEORIGIN instead of DENY. */
export const FRAMEABLE_PATHS: ReadonlySet<string> = new Set(['/proposal-preview.html'])

/**
 * Swagger UI at /docs: scripts and styles from unpkg (pinned with SRI), the one inline bootstrap
 * script allowed by its hash, inline styles and data: images that swagger-ui renders.
 */
export function docsContentSecurityPolicy(inlineScript: string): string {
  const hash = createHash('sha256').update(inlineScript).digest('base64')
  return policy({
    'default-src': ["'none'"],
    'script-src': ['https://unpkg.com', `'sha256-${hash}'`],
    'style-src': ['https://unpkg.com', "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  })
}

// No feature the client uses needs these powerful APIs; deny them to the page and any frame.
export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()'

// One year; sent only over HTTPS (browsers ignore it on http anyway, and localhost must keep working).
export const HSTS = 'max-age=31536000'

// Middleware đặt các security header chung cho mọi response
/**
 * Baseline security headers without a helmet dependency. `hsts` is on in production only: then a
 * request that arrived over HTTPS — directly, or per X-Forwarded-Proto from a proxy trusted through
 * `trust proxy` — gets Strict-Transport-Security. A route may override the CSP (see /docs).
 */
export function securityHeaders(options: { hsts: boolean }) {
  return function setSecurityHeaders(req: Request, res: Response, next: NextFunction) {
    const frameable = FRAMEABLE_PATHS.has(req.path)
    res.setHeader('Content-Security-Policy', frameable ? FRAMEABLE_APP_CSP : APP_CSP)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', frameable ? 'SAMEORIGIN' : 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY)
    if (options.hsts && req.secure) {
      res.setHeader('Strict-Transport-Security', HSTS)
    }
    next()
  }
}
