import { existsSync } from 'node:fs'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response, type Router } from 'express'

// Vite fingerprints every file under assets/, so a URL there never changes content.
const IMMUTABLE = 'public, max-age=31536000, immutable'
// HTML entry points must be revalidated, or a deploy keeps old pages pointing at removed bundles.
const REVALIDATE = 'no-cache'
// Unhashed files copied from client/public (icon.png…): cache briefly.
const SHORT = 'public, max-age=3600'

// Paths the SPA never owns: the API and the API docs keep their JSON 404s.
const SERVER_PREFIX = /^\/(api|docs)(\/|$)/

// Tạo router phục vụ bản build của client (một container chạy cả API và SPA)
/**
 * Serves the built client from `distDir`: files as they are, with long caching for hashed assets and
 * no-cache for HTML, then index.html for any other GET that looks like a client route (no file
 * extension, not under /api or /docs). Everything else falls through to the JSON 404.
 * Throws at startup when the folder has no index.html, so a wrong CLIENT_DIST_DIR fails fast.
 */
export function staticClientRoutes(distDir: string): Router {
  const root = path.resolve(distDir)
  const indexFile = path.join(root, 'index.html')
  if (!existsSync(indexFile)) {
    throw new Error(`CLIENT_DIST_DIR has no index.html: ${root}`)
  }
  const assetsDir = path.join(root, 'assets') + path.sep
  const router = express.Router()
  router.use(
    express.static(root, {
      index: false,
      redirect: false,
      dotfiles: 'ignore',
      setHeaders(res, filePath) {
        res.setHeader(
          'Cache-Control',
          filePath.startsWith(assetsDir)
            ? IMMUTABLE
            : filePath.endsWith('.html')
              ? REVALIDATE
              : SHORT,
        )
      },
    }),
  )
  // Trả index.html cho mọi đường dẫn của SPA để React Router tự định tuyến
  router.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
    if (SERVER_PREFIX.test(req.path) || path.posix.extname(req.path) !== '') {
      next()
      return
    }
    res.setHeader('Cache-Control', REVALIDATE)
    res.sendFile(indexFile, (err) => {
      if (err) {
        next(err)
      }
    })
  })
  return router
}
