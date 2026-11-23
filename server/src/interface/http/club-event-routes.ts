import { raw, Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { ClubAccessRepository } from '../../domain/access.js'
import type {
	ClubEventAction,
	ClubEventInput,
	ClubEventRepository,
	EventProposalFileStorage,
	EventPublishInput,
	InternalClubEventInput,
} from '../../domain/club-event.js'
import { PROPOSAL_DOCUMENT_MAX_BYTES } from '../../domain/club-event-rules.js'
import { DomainError } from '../../domain/errors.js'
import type { SessionService } from '../../domain/session.js'
import type { AccessActor } from '../../usecase/access.js'
import {
	actOnClubEvent,
	clubEventOptions,
	clubEventFeedback,
	clubEventParticipants,
	clubEventProposalDocumentAccess,
	createClubEvent,
	createInternalClubEvent,
	downloadEventProposalTemplate,
	eventProposalTemplateInfo,
	getClubEvent,
	listClubEvents,
	reviewEventProposalDocumentAccess,
	uploadEventProposalDocument,
	uploadEventProposalTemplate,
} from '../../usecase/club-event.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'

export const eventObjectId = z.string().regex(/^[0-9a-f]{24}$/i)
const date = z.string().datetime()
const expectedVersion = z.number().int().nonnegative()
const reason = z.string().trim().min(1).max(2000)
const formField = z
	.object({
		key: z.string().min(1).max(80),
		label: z.string().min(1).max(300),
		type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox']),
		required: z.boolean(),
		options: z.array(z.string().min(1).max(300)).max(30).optional(),
	})
	.strict()
export const clubEventBody = z
	.object({
		title: z.string().trim().min(1).max(200),
		objective: z.string().trim().min(1).max(5000),
		plan: z.string().trim().min(1).max(20000),
		startAt: date,
		endAt: date,
		venueText: z.string().trim().max(300).optional(),
		propertyId: eventObjectId.optional(),
		audienceScope: z.enum(['PUBLIC', 'MEMBERS_ONLY']),
		capacity: z.number().int().min(1).max(100000),
		riskCategory: z.enum(['LOW', 'MEDIUM', 'HIGH']),
		riskNote: z.string().max(5000).optional(),
		facilityNeeds: z.string().max(5000).optional(),
		occurrences: z
			.array(
				z
					.object({
						startAt: date,
						endAt: date,
						venueText: z.string().trim().max(300).optional(),
						propertyId: eventObjectId.optional(),
					})
					.strict(),
			)
			.max(50)
			.optional(),
		budgetLines: z
			.array(
				z
					.object({
						category: z.string().trim().min(1).max(200),
						amount: z.number().int().positive().max(1000000000000),
						purpose: z.string().trim().min(1).max(2000),
						plannedItems: z.string().max(5000).optional(),
					})
					.strict(),
			)
			.max(50),
		bookingIds: z.array(eventObjectId).max(50),
		registrationForm: z.array(formField).max(30).optional(),
	})
	.strict()
export const clubEventSaveBody = clubEventBody.extend({ expectedVersion }).strict()
export const clubEventVersionBody = z.object({ expectedVersion }).strict()
const publishSettings = z
	.object({
		registrationOpenAt: date.optional(),
		registrationCloseAt: date.optional(),
		checkInOpenAt: date,
		checkInCloseAt: date,
		allowWalkIn: z.boolean(),
		waitlistEnabled: z.boolean(),
		notifyMembers: z.boolean().optional(),
	})
	.strict()
export const clubEventPublishBody = publishSettings.extend({ expectedVersion }).strict()
export const internalClubEventBody = clubEventBody
	.pick({
		title: true,
		objective: true,
		plan: true,
		startAt: true,
		endAt: true,
		venueText: true,
		propertyId: true,
		capacity: true,
		riskCategory: true,
		bookingIds: true,
	})
	.strict()
export const internalClubEventCreateBody = internalClubEventBody
	.extend({
		mode: z.enum(['draft', 'create', 'publish']).optional(),
		publishInput: publishSettings.optional(),
	})
	.strict()
export const internalClubEventSaveBody = internalClubEventBody.extend({ expectedVersion }).strict()
export const clubEventCancelBody = z.object({ expectedVersion, reason }).strict()
export const clubEventRescheduleBody = z
	.object({
		expectedVersion,
		reason,
		startAt: date,
		endAt: date,
		venueText: z.string().max(300).optional(),
		propertyId: eventObjectId.optional(),
	})
	.strict()
export const clubEventCapacityBody = z
	.object({ capacity: z.number().int().min(1).max(100000) })
	.strict()
export const clubEventPromoteBody = z.object({ registrationId: eventObjectId }).strict()
export const clubEventCheckInBody = z
	.object({ studentId: eventObjectId, reason: reason.optional() })
	.strict()
export const clubEventCorrectBody = z
	.object({ studentId: eventObjectId, reason, checkedInAt: date.optional(), absent: z.boolean() })
	.strict()
export const clubEventReasonBody = z.object({ reason }).strict()
export const clubEventFeedbackQuery = z.object({ eventIds: z.string().min(1).max(1000) }).strict()
export const proposalDocumentAccessQuery = z
	.object({
		revisionNo: z
			.string()
			.regex(/^[1-9][0-9]{0,5}$/)
			.optional(),
		inline: z.enum(['true', 'false']).optional(),
	})
	.strict()
const emptyBody = z.object({}).strict()
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
	const result = schema.safeParse(raw)
	if (!result.success)
		throw new DomainError('invalid event request', 'validation', result.error.issues)
	return result.data
}
function actor(res: Response): AccessActor {
	return res.locals.actor as AccessActor
}
function input(body: z.infer<typeof clubEventBody>): ClubEventInput {
	return {
		...body,
		startAt: new Date(body.startAt),
		endAt: new Date(body.endAt),
		occurrences: body.occurrences?.map((o) => ({
			startAt: new Date(o.startAt),
			endAt: new Date(o.endAt),
			...(o.venueText ? { venueText: o.venueText } : {}),
			...(o.propertyId ? { propertyId: o.propertyId } : {}),
		})),
	}
}
function internalInput(body: z.infer<typeof internalClubEventBody>): InternalClubEventInput {
	return { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) }
}
function publishInput(body: z.infer<typeof publishSettings>): EventPublishInput {
	return {
		...body,
		registrationOpenAt: body.registrationOpenAt ? new Date(body.registrationOpenAt) : undefined,
		registrationCloseAt: body.registrationCloseAt ? new Date(body.registrationCloseAt) : undefined,
		checkInOpenAt: new Date(body.checkInOpenAt),
		checkInCloseAt: new Date(body.checkInCloseAt),
	}
}
/** Raw upload: body bytes, `Content-Type`, and the URI-encoded `X-Filename` header. */
function uploadedFile(req: Request): { fileName: string; mimeType: string; bytes: Buffer } {
	if (!Buffer.isBuffer(req.body)) throw new DomainError('file body is required', 'validation')
	const header = req.header('X-Filename')
	if (!header) throw new DomainError('file name is required', 'validation')
	try {
		return {
			fileName: decodeURIComponent(header),
			mimeType: req.header('Content-Type') ?? '',
			bytes: req.body,
		}
	} catch {
		throw new DomainError('invalid file name', 'validation')
	}
}
function documentQuery(raw: unknown): { revisionNo?: number; inline: boolean } {
	const query = parse(proposalDocumentAccessQuery, raw)
	return {
		revisionNo: query.revisionNo ? Number(query.revisionNo) : undefined,
		inline: query.inline === 'true',
	}
}
/** `attachment` with an ASCII fallback name and the exact UTF-8 name (RFC 5987) for Vietnamese file names. */
function attachmentHeader(fileName: string): string {
	const ascii = fileName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.replace(/[^\x20-\x7e]|["\\]/g, '_')
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`
}
export interface ClubEventRouteDeps {
	repo: ClubEventRepository
	access: ClubAccessRepository
	authRepo: AuthRepository
	sessions: SessionService
	files?: EventProposalFileStorage | null
}
export function clubEventRoutes(deps: ClubEventRouteDeps): Router {
	const router = Router()
	const guard = { repo: deps.authRepo, sessions: deps.sessions }
	const usecases = {
		repo: deps.repo,
		access: deps.access,
		auth: deps.authRepo,
		files: deps.files ?? null,
	}
	const uploadTemplate = raw({ type: () => true, limit: '10mb' })
	const base = '/clubs/:clubId/events'
	router.get(base, authGuard(guard, false), async (req, res) => {
		ok(
			res,
			await listClubEvents(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				new Date(),
			),
		)
	})
	router.get(`${base}/options`, authGuard(guard, false), async (req, res) => {
		ok(
			res,
			await clubEventOptions(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				new Date(),
			),
		)
	})
	router.get(`${base}/feedback`, authGuard(guard, false), async (req, res) => {
		const query = parse(clubEventFeedbackQuery, req.query)
		ok(
			res,
			await clubEventFeedback(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				query.eventIds.split(','),
				new Date(),
			),
		)
	})
	router.get(`${base}/:id`, authGuard(guard, false), async (req, res) => {
		ok(
			res,
			await getClubEvent(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				parse(eventObjectId, req.params.id),
				new Date(),
			),
		)
	})
	router.get(`${base}/:id/participants`, authGuard(guard, false), async (req, res) => {
		ok(
			res,
			await clubEventParticipants(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				parse(eventObjectId, req.params.id),
				new Date(),
			),
		)
	})
	router.post(base, authGuard(guard), async (req, res) => {
		ok(
			res,
			await createClubEvent(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				input(parse(clubEventBody, req.body)),
				new Date(),
			),
			201,
		)
	})
	const actions: { path: string; parse: (raw: unknown) => ClubEventAction }[] = [
		{
			path: 'save',
			parse: (raw) => {
				const { expectedVersion, ...body } = parse(clubEventSaveBody, raw)
				return { kind: 'save', input: input(body), expectedVersion }
			},
		},
		{ path: 'submit', parse: (raw) => ({ kind: 'submit', ...parse(clubEventVersionBody, raw) }) },
		{
			path: 'publish',
			parse: (raw) => {
				const { expectedVersion, ...body } = parse(clubEventPublishBody, raw)
				return { kind: 'publish', expectedVersion, input: publishInput(body) }
			},
		},
		{ path: 'cancel', parse: (raw) => ({ kind: 'cancel', ...parse(clubEventCancelBody, raw) }) },
		{
			path: 'reschedule',
			parse: (raw) => {
				const body = parse(clubEventRescheduleBody, raw)
				return {
					kind: 'reschedule',
					...body,
					startAt: new Date(body.startAt),
					endAt: new Date(body.endAt),
				}
			},
		},
		{
			path: 'capacity',
			parse: (raw) => ({ kind: 'capacity', ...parse(clubEventCapacityBody, raw) }),
		},
		{ path: 'promote', parse: (raw) => ({ kind: 'promote', ...parse(clubEventPromoteBody, raw) }) },
		{
			path: 'check-ins',
			parse: (raw) => ({ kind: 'check-in', ...parse(clubEventCheckInBody, raw) }),
		},
		{
			path: 'attendance/correct',
			parse: (raw) => {
				const body = parse(clubEventCorrectBody, raw)
				return {
					kind: 'correct',
					...body,
					checkedInAt: body.checkedInAt ? new Date(body.checkedInAt) : undefined,
				}
			},
		},
		{
			path: 'attendance/finalize',
			parse: (raw) => {
				parse(emptyBody, raw)
				return { kind: 'finalize' }
			},
		},
		{
			path: 'attendance/unlock',
			parse: (raw) => ({ kind: 'unlock', ...parse(clubEventReasonBody, raw) }),
		},
	]
	for (const action of actions)
		router.post(`${base}/:id/${action.path}`, authGuard(guard), async (req, res) => {
			ok(
				res,
				await actOnClubEvent(
					usecases,
					actor(res),
					parse(eventObjectId, req.params.clubId),
					parse(eventObjectId, req.params.id),
					action.parse(req.body),
					new Date(),
				),
			)
		})
	const internalBase = '/clubs/:clubId/internal-events'
	router.post(internalBase, authGuard(guard), async (req, res) => {
		const { mode, publishInput: settings, ...body } = parse(internalClubEventCreateBody, req.body)
		ok(
			res,
			await createInternalClubEvent(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				internalInput(body),
				mode ?? 'draft',
				settings ? publishInput(settings) : undefined,
				new Date(),
			),
			201,
		)
	})
	router.put(`${internalBase}/:id`, authGuard(guard), async (req, res) => {
		const { expectedVersion, ...body } = parse(internalClubEventSaveBody, req.body)
		ok(
			res,
			await actOnClubEvent(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				parse(eventObjectId, req.params.id),
				{ kind: 'save-internal', input: internalInput(body), expectedVersion },
				new Date(),
			),
		)
	})
	router.post(`${internalBase}/:id/create`, authGuard(guard), async (req, res) => {
		ok(
			res,
			await actOnClubEvent(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				parse(eventObjectId, req.params.id),
				{ kind: 'create-internal', ...parse(clubEventVersionBody, req.body) },
				new Date(),
			),
		)
	})
	router.get('/events/proposal-template', authGuard(guard, false), async (_req, res) => {
		ok(res, await eventProposalTemplateInfo(usecases, actor(res)))
	})
	router.get('/events/proposal-template/download', authGuard(guard, false), async (_req, res) => {
		const result = await downloadEventProposalTemplate(usecases, actor(res))
		if (result.kind === 'redirect') return res.redirect(302, result.url)
		res.setHeader('Content-Disposition', attachmentHeader(result.fileName))
		res.type(result.mimeType).send(result.content)
	})
	// Parse a raw file body under the upload size limit; the use case validates the file/state.
	router.post(
		`${base}/:id/proposal-document`,
		authGuard(guard),
		raw({ type: () => true, limit: PROPOSAL_DOCUMENT_MAX_BYTES }),
		async (req, res) => {
			const file = uploadedFile(req)
			ok(
				res,
				await uploadEventProposalDocument(
					usecases,
					actor(res),
					parse(eventObjectId, req.params.clubId),
					parse(eventObjectId, req.params.id),
					file.fileName,
					file.mimeType,
					file.bytes,
					new Date(),
				),
			)
		},
	)
	router.get(`${base}/:id/proposal-document/access`, authGuard(guard, false), async (req, res) => {
		const query = documentQuery(req.query)
		ok(
			res,
			await clubEventProposalDocumentAccess(
				usecases,
				actor(res),
				parse(eventObjectId, req.params.clubId),
				parse(eventObjectId, req.params.id),
				query.revisionNo,
				query.inline,
				new Date(),
			),
		)
	})
	// Template replacement is CSRF-protected and restricted to officers by the use case.
	router.post(
		'/admin/event-proposals/template',
		authGuard(guard),
		uploadTemplate,
		async (req, res) => {
			const file = uploadedFile(req)
			ok(
				res,
				await uploadEventProposalTemplate(
					usecases,
					actor(res),
					file.fileName,
					file.mimeType,
					file.bytes,
					new Date(),
				),
				201,
			)
		},
	)
	router.get(
		'/admin/event-proposals/:id/document/access',
		authGuard(guard, false),
		async (req, res) => {
			const query = documentQuery(req.query)
			ok(
				res,
				await reviewEventProposalDocumentAccess(
					usecases,
					actor(res),
					parse(eventObjectId, req.params.id),
					query.revisionNo,
					query.inline,
				),
			)
		},
	)
	return router
}
