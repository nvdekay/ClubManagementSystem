// Shared helpers of the guide capture: Vietnamese UI, waiting for data, and saving one PNG.
import path from 'node:path'

import type { Locator, Page } from '@playwright/test'

import { clientDir } from '../setup/env'

/** Where GUIDE_BOOK.md links its screenshots. */
export const imagesDir = path.resolve(clientDir, '../docs/06-user-guide/images')

/** Switches the app to Vietnamese; runs after the shared fixture has set English. */
export async function useVietnamese(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('locale', 'vi')
      window.localStorage.setItem('theme', 'light')
    } catch {
      // Storage can be unavailable on an opaque origin.
    }
  })
}

/** Waits until requests have settled and no skeleton or busy region is left on screen. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page
    .locator('.animate-pulse, [aria-busy="true"]')
    .first()
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => undefined)
  await page.waitForLoadState('networkidle')
  // Fonts, images and transitions (dialogs fade in) finish after the data.
  await page.evaluate(() => document.fonts.ready)
  await page
    .waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, {
      timeout: 10_000,
    })
    .catch(() => undefined)
  await page.waitForTimeout(400)
}

/** Opens a route and waits for its data. */
export async function open(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await settle(page)
}

/** Brings a section into view near the top of the window, then waits for it to settle. */
export async function scrollTo(page: Page, target: Locator, offset = 96): Promise<void> {
  await target.first().scrollIntoViewIfNeeded()
  await target.first().evaluate((element, top) => {
    const box = element.getBoundingClientRect()
    let scroller: HTMLElement | null = element.parentElement
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1) {
      scroller = scroller.parentElement
    }
    if (scroller && scroller !== document.body && scroller !== document.documentElement) {
      scroller.scrollBy(0, box.top - scroller.getBoundingClientRect().top - top)
    } else {
      window.scrollBy(0, box.top - top)
    }
  }, offset)
  await settle(page)
}

/** Saves the visible window as docs/06-user-guide/images/<file>. */
export async function shoot(page: Page, file: string): Promise<void> {
  await settle(page)
  // Let success toasts fade so they do not cover the page.
  await page
    .locator('[data-sonner-toast]')
    .first()
    .waitFor({ state: 'detached', timeout: 8_000 })
    .catch(() => undefined)
  await page.mouse.move(1435, 995)
  await page.screenshot({ path: path.join(imagesDir, file), animations: 'disabled', caret: 'hide' })
}
