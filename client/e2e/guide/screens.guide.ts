// One test per screenshot of docs/04-user-guide (file names match images/manifest.json). Tests run
// in file order on one worker: a few steps act on shared records (open a review, schedule a
// defense) and later captures rely on that. Selectors use the Vietnamese UI text.
import type { Page } from '@playwright/test'

import { test } from '../fixtures'
import { hebeClubId } from '../setup/env'
import { open, scrollTo, settle, shoot, useVietnamese } from './capture'

const hebe = `/club/${hebeClubId}`
/** Mây Mưa Club: the officer account is a plain member there, so it shows the Club Member view. */
const mayMua = 'a10000000000000000000019'

test.beforeEach(async ({ page, pageIssues }) => {
  await useVietnamese(page)
  // The guide stack has no Cloudinary, so file previews may fail; that does not spoil a capture.
  pageIssues.allow(/./)
})

/** Picks an option of an AppSelect combobox. */
async function choose(page: Page, combobox: string | RegExp, option: string | RegExp) {
  await page.getByRole('combobox', { name: combobox }).first().click()
  await page.getByRole('option', { name: option }).first().click()
  await settle(page)
}

/** Clicks the first button or link with this visible name inside the main area. */
async function press(page: Page, name: string | RegExp) {
  const main = page.getByRole('main')
  await main.getByRole('button', { name }).or(main.getByRole('link', { name })).first().click()
  await settle(page)
}

/** Narrows a table of events to one title, then opens it. */
async function openEvent(page: Page, title: string) {
  await page.getByRole('main').getByRole('textbox', { name: 'Tìm sự kiện' }).fill(title)
  await settle(page)
  await press(page, title)
}

test.describe('guest', () => {
  test('01-login', async ({ page }) => {
    await open(page, '/login')
    await shoot(page, '01-login.png')
  })
})

test.describe('student', () => {
  test.use({ role: 'student' })

  for (const [file, url] of [
    ['02-home.png', '/'],
    ['03-club-directory.png', '/clubs'],
    ['04-club-detail.png', `/clubs/${hebeClubId}`],
    ['05-event-directory.png', '/events'],
    ['07-student-home.png', '/student'],
    ['08-founding-form.png', '/workspace/applications/new'],
    ['31-my-events.png', '/workspace/event-registrations'],
    ['55-student-complaints.png', '/workspace/complaints'],
  ] as const) {
    test(file, async ({ page }) => {
      await open(page, url)
      await shoot(page, file)
    })
  }

  test('18-recruitment-apply', async ({ page }) => {
    await open(page, `/clubs/${hebeClubId}`)
    await press(page, 'Ứng tuyển đợt này')
    await shoot(page, '18-recruitment-apply.png')
  })

  test('30-event-register', async ({ page }) => {
    await open(page, '/events')
    await page.getByPlaceholder(/Nhập tên/).fill('Buổi giao lưu HEBE Club #8')
    await settle(page)
    await press(page, 'Xem chi tiết')
    await scrollTo(page, page.getByText('Đăng ký tham gia', { exact: true }))
    await shoot(page, '30-event-register.png')
  })
})

test.describe('club member', () => {
  test.use({ role: 'member' })

  test('22-member-space', async ({ page }) => {
    await open(page, `/workspace/clubs/${hebeClubId}`)
    await shoot(page, '22-member-space.png')
  })
})

test.describe('officer: queues that the club side acts on later', () => {
  test.use({ role: 'officer' })

  test('09-founding-review-queue, 10-founding-review-detail', async ({ page }) => {
    await open(page, '/workspace/reviews')
    await shoot(page, '09-founding-review-queue.png')
    await press(page, 'Mở thẩm định')
    await shoot(page, '10-founding-review-detail.png')
  })

  test('25-event-proposal-queue, 26-event-proposal-review, 69-defense-schedule', async ({
    page,
  }) => {
    await open(page, '/workspace/event-proposals')
    await shoot(page, '25-event-proposal-queue.png')
    // Opening a pending proposal claims it for this officer.
    await page
      .getByRole('heading', { name: 'HEBE Dance Battle 2026', exact: true })
      .locator('xpath=ancestor::*[.//button[starts-with(normalize-space(.), "Mở")]][1]')
      .getByRole('button', { name: /^Mở/ })
      .click()
    await page.waitForURL(/\/workspace\/event-proposals\/[0-9a-f]{24}$/)
    await settle(page)
    await shoot(page, '26-event-proposal-review.png')
    await press(page, 'Tạo lịch bảo vệ')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox').first().click()
    await page.getByRole('option', { name: /Trống/ }).first().click()
    await dialog
      .getByRole('textbox')
      .last()
      .fill('Trình bày kế hoạch an ninh và phương án ngân sách âm thanh, ánh sáng.')
    await settle(page)
    await shoot(page, '69-defense-schedule.png')
    await dialog.getByRole('button', { name: 'Tạo lịch bảo vệ' }).click()
    await settle(page)
  })
})

test.describe('club leader (HEBE)', () => {
  test.use({ role: 'leader' })

  for (const [file, url] of [
    ['06-workspace-chooser.png', '/workspace'],
    ['11-club-leader-home.png', hebe],
    ['12-club-member-home.png', `/club/${mayMua}`],
    ['17-recruitment-campaign.png', `${hebe}/recruitment`],
    ['20-members-manage.png', `${hebe}/members`],
    ['21-members-readonly.png', `/club/${mayMua}/members`],
    ['24-event-proposal-form.png', `${hebe}/events/new`],
    ['37-club-rooms.png', `${hebe}/rooms`],
    ['56-club-complaints.png', `${hebe}/complaints`],
    ['65-club-transition-plan.png', `${hebe}/transition-plans`],
    ['66-club-invitations.png', `${hebe}/invitations`],
  ] as const) {
    test(file, async ({ page }) => {
      await open(page, url)
      await shoot(page, file)
    })
  }

  test('14-board-nomination', async ({ page }) => {
    // prepare-guide.ts left one Vice Leader seat vacant; nominate a member to it. ICPDP reviews
    // this nomination in 15-board-nomination-review.
    await open(page, `${hebe}/board`)
    await choose(page, /^Người được đề cử:/, 'Nguyễn Hoàng Hoa')
    await shoot(page, '14-board-nomination.png')
    await press(page, 'Nộp đề cử')
  })

  test('19-recruitment-review', async ({ page }) => {
    await open(page, `${hebe}/recruitment`)
    await press(page, 'Xét duyệt đơn')
    await shoot(page, '19-recruitment-review.png')
  })

  test('23-club-events', async ({ page }) => {
    await open(page, `${hebe}/events`)
    await openEvent(page, 'Đêm diễn HEBE Club #9')
    await shoot(page, '23-club-events.png')
  })

  test('70-club-defense-card', async ({ page }) => {
    await open(page, `${hebe}/events`)
    await openEvent(page, 'HEBE Dance Battle 2026')
    await scrollTo(page, page.getByText('Lịch hẹn bảo vệ đề án với ICPDP'))
    await shoot(page, '70-club-defense-card.png')
  })

  test('13-club-settings', async ({ page }) => {
    await open(page, `${hebe}/settings`)
    await shoot(page, '13-club-settings.png')
  })

  test('32-attendance', async ({ page }) => {
    await open(page, `${hebe}/event-attendance`)
    await openEvent(page, 'Đêm nhạc chào tân sinh viên K21')
    await shoot(page, '32-attendance.png')
  })

  test('33-event-feedback', async ({ page }) => {
    await open(page, `${hebe}/event-feedback`)
    for (const title of ['Đêm nhạc chào tân sinh viên K21', 'Chuyến dã ngoại HEBE Club #6']) {
      await page.getByRole('main').getByRole('checkbox', { name: title }).check()
    }
    await settle(page)
    await shoot(page, '33-event-feedback.png')
  })

  test('38-club-booking-request', async ({ page }) => {
    await open(page, `${hebe}/bookings`)
    await press(page, 'Yêu cầu cơ sở vật chất')
    await shoot(page, '38-club-booking-request.png')
  })

  test('40-report-draft, 41-report-returned', async ({ page }) => {
    await open(page, `${hebe}/event-reports`)
    await choose(page, /Chọn sự kiện/, 'Wave 4 demo: top-up')
    await shoot(page, '40-report-draft.png')
    await choose(page, /Chọn sự kiện/, 'Wave 4 demo: balanced')
    await shoot(page, '41-report-returned.png')
  })

  test('47-club-expenses, 48-club-refund', async ({ page }) => {
    await open(page, `${hebe}/budgets`)
    await choose(page, /Chọn sự kiện/, /Đêm nhạc gây quỹ HEBE/)
    await shoot(page, '47-club-expenses.png')
    await scrollTo(page, page.getByText('Thuê trang phục biểu diễn').first())
    await shoot(page, '48-club-refund.png')
  })

  test('67-club-periodic-report', async ({ page }) => {
    await open(page, `${hebe}/periodic-reports`)
    await scrollTo(page, page.getByText(/Link ảnh minh chứng hoặc tải ảnh lên/), 360)
    await shoot(page, '67-club-periodic-report.png')
  })
})

test.describe('ICPDP officer', () => {
  test.use({ role: 'officer' })

  for (const [file, url] of [
    ['27-school-events.png', '/workspace/school-events'],
    ['34-properties.png', '/workspace/properties'],
    ['35-room-allocations.png', '/workspace/room-allocations'],
    ['43-periodic-reports.png', '/workspace/periodic-reports'],
    ['45-budgets.png', '/workspace/budgets'],
    ['58-icpdp-clubs.png', '/icpdp/clubs'],
    ['60-policy.png', '/workspace/policy'],
    ['61-club-fields.png', '/workspace/club-fields'],
    ['63-exports.png', '/workspace/exports'],
    ['64-icpdp-home.png', '/icpdp'],
    ['68-suspension-requests.png', '/workspace/suspension-requests'],
  ] as const) {
    test(file, async ({ page }) => {
      await open(page, url)
      await shoot(page, file)
    })
  }

  test('15-board-nomination-review', async ({ page }) => {
    await open(page, '/workspace/board-nominations')
    await press(page, 'Xem đề cử')
    await press(page, 'Nhận quyết định')
    await page
      .getByRole('main')
      .getByRole('textbox')
      .last()
      .fill('Thành viên tích cực, đủ điều kiện.')
    await settle(page)
    await shoot(page, '15-board-nomination-review.png')
  })

  test('72-live-defense-room', async ({ page }) => {
    // The "Hackathon An toàn thông tin 24h" proposal (fixed id from seed-demo), whose defense
    // prepare-guide.ts started five minutes before the capture.
    await open(page, '/workspace/event-proposals/de0000000000000000000f02/defense')
    await shoot(page, '72-live-defense-room.png')
  })

  test('54-evaluations, 73-evaluation-draft', async ({ page }) => {
    // Accepting a periodic report generated these Summer 2026 drafts (prepare-guide.ts).
    await open(page, '/workspace/evaluations?period=Summer%202026')
    const draft = page.getByRole('main').getByRole('row').filter({ hasText: 'Đã có dữ liệu' })
    await scrollTo(page, draft, 420)
    await shoot(page, '54-evaluations.png')
    await draft.first().getByRole('link', { name: 'Mở' }).click()
    await settle(page)
    // Open the data lineage of D5 (report discipline), which the accepted report feeds.
    const d5 = page.getByRole('main').getByRole('button', { name: 'Xem dữ liệu' }).nth(4)
    await d5.click()
    await scrollTo(page, d5, 360)
    await shoot(page, '73-evaluation-draft.png')
  })

  test('16-transition-review', async ({ page }) => {
    await open(page, '/workspace/leadership-transitions')
    await press(page, 'Thẩm định chuyển giao')
    await shoot(page, '16-transition-review.png')
  })

  test('28-school-event-create', async ({ page }) => {
    await open(page, '/workspace/school-events')
    await press(page, 'Tạo sự kiện cấp trường')
    await shoot(page, '28-school-event-create.png')
  })

  test('29-school-event-detail', async ({ page }) => {
    await open(page, '/workspace/school-events')
    await press(page, /Tập huấn kỹ năng tổ chức sự kiện/)
    await shoot(page, '29-school-event-detail.png')
  })

  test('36-room-allocation-create', async ({ page }) => {
    await open(page, '/workspace/room-allocations')
    await press(page, 'Phân phòng')
    await shoot(page, '36-room-allocation-create.png')
  })

  test('39-booking-review', async ({ page }) => {
    await open(page, '/workspace/bookings')
    await press(page, /Hội trường/)
    await shoot(page, '39-booking-review.png')
  })

  test('42-report-review', async ({ page }) => {
    await open(page, '/workspace/event-reports')
    await choose(page, /Chọn sự kiện/, /Wave 4 demo: refund/)
    await shoot(page, '42-report-review.png')
  })

  test('44-periodic-report-review', async ({ page }) => {
    await open(page, '/workspace/periodic-reports')
    await press(page, 'Thẩm định')
    await shoot(page, '44-periodic-report-review.png')
  })

  test('46-budget-advance', async ({ page }) => {
    await open(page, '/workspace/budgets')
    await press(page, /^Chờ giải ngân trước · \d+$/)
    await page.getByRole('main').getByRole('listitem').first().getByRole('link').first().click()
    await settle(page)
    await shoot(page, '46-budget-advance.png')
  })

  test('49-reconciliation, 50-vendor-payment', async ({ page }) => {
    await open(page, '/workspace/budgets')
    await press(page, /^Chờ đối soát · \d+$/)
    await press(page, /Đêm nhạc gây quỹ HEBE/)
    await scrollTo(page, page.getByText('In ấn banner, standee').first())
    await shoot(page, '49-reconciliation.png')
    await scrollTo(page, page.getByText(/Âm thanh, ánh sáng/).first())
    await shoot(page, '50-vendor-payment.png')
  })

  test('51-violations, 52-violation-detail', async ({ page }) => {
    await open(page, '/workspace/violations')
    await press(page, /^Tất cả · \d+$/)
    await shoot(page, '51-violations.png')
    await press(page, /^Chờ CLB giải trình · \d+$/)
    await page
      .getByRole('main')
      .getByRole('link', { name: /Mở ngày/ })
      .first()
      .click()
    await settle(page)
    await shoot(page, '52-violation-detail.png')
  })

  test('53-evaluation-scheme', async ({ page }) => {
    await open(page, '/workspace/evaluation-schemes')
    await press(page, 'Xem')
    await shoot(page, '53-evaluation-scheme.png')
  })

  test('71-unsaved-changes', async ({ page }) => {
    await open(page, '/workspace/policy')
    await page.getByRole('tab', { name: /Phiên bản chính sách mới/ }).click()
    await settle(page)
    await page.getByRole('tabpanel').getByRole('spinbutton').first().fill('5')
    await page.getByRole('navigation').getByRole('link', { name: 'Tổng quan' }).first().click()
    await page.getByRole('dialog').waitFor()
    await settle(page)
    await shoot(page, '71-unsaved-changes.png')
  })

  test('57-icpdp-complaints', async ({ page }) => {
    await open(page, '/workspace/complaint-review')
    await press(page, 'Bắt đầu xem xét')
    await shoot(page, '57-icpdp-complaints.png')
  })

  test('59-club-manage', async ({ page }) => {
    await open(page, '/icpdp/clubs')
    await press(page, 'Quản lý')
    await shoot(page, '59-club-manage.png')
  })

  test('62-accounts', async ({ page }) => {
    await open(page, '/icpdp/accounts')
    await press(page, 'Quản lý')
    await shoot(page, '62-accounts.png')
  })
})
