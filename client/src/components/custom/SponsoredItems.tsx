import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppMoneyInput } from '@/components/ui/money-input/AppMoneyInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import {
	useDownloadInvoiceFile,
	useInvoiceImage,
	useRefundAccount,
	useSponsoredItemAction,
	useSponsoredItems,
} from '@/hooks/useSponsoredItems'
import {
	DIRECT_VENDOR_THRESHOLD_VND,
	MAX_INVOICE_IMAGE_BYTES,
	MAX_INVOICE_PDF_BYTES,
	resolvePaymentChannel,
	type InvoiceImage,
	type ItemAction,
	type SponsoredBudget,
	type SponsoredItem,
	type VendorBankInfo,
} from '@/services/sponsoredItems'
import { cn } from '@/utils/cn'

const EMPTY_VENDOR: VendorBankInfo = {
	vendorName: '',
	accountHolder: '',
	accountNumber: '',
	bankName: '',
	bankBranch: '',
	transferNote: '',
}

// Kích hoạt tải xuống tệp từ URL có chữ ký (attachment=true)
function triggerUrlDownload(url: string, fileName: string): void {
	const link = document.createElement('a')
	link.href = url
	link.download = fileName
	link.rel = 'noopener noreferrer'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

// Kiểm tra tệp chứng từ tải lên có hợp lệ về định dạng và dung lượng
function isAllowedAttachment(file: File): boolean {
	if (file.type === 'application/pdf') return file.size > 0 && file.size <= MAX_INVOICE_PDF_BYTES
	if (file.type === 'image/jpeg' || file.type === 'image/png')
		return file.size > 0 && file.size <= MAX_INVOICE_IMAGE_BYTES
	return false
}

// So sánh hai bản ghi thông tin chuyển khoản nhà cung cấp
function sameVendorInfo(a: VendorBankInfo | undefined, b: VendorBankInfo): boolean {
	return (
		(a?.vendorName ?? '') === b.vendorName.trim() &&
		(a?.accountHolder ?? '') === b.accountHolder.trim() &&
		(a?.accountNumber ?? '') === b.accountNumber.trim() &&
		(a?.bankName ?? '') === b.bankName.trim() &&
		(a?.bankBranch ?? '') === (b.bankBranch?.trim() ?? '') &&
		(a?.transferNote ?? '') === (b.transferNote?.trim() ?? '')
	)
}

// Kiểm tra thông tin chuyển khoản nhà cung cấp đã đủ các trường bắt buộc
function isVendorInfoComplete(info: VendorBankInfo | undefined): boolean {
	if (!info) return false
	return Boolean(
		info.vendorName.trim() &&
		info.accountHolder.trim() &&
		info.accountNumber.trim() &&
		info.bankName.trim(),
	)
}

// Xem trước và tải xuống một tệp chứng từ (ảnh JPG/PNG hoặc PDF)
function AttachmentCard({
	budgetId,
	clubId,
	itemId,
	file,
	editable,
	busy,
	onRemove,
}: {
	budgetId: string
	clubId?: string
	itemId: string
	file: InvoiceImage
	editable: boolean
	busy: boolean
	onRemove: () => void
}) {
	const { t } = useTranslation()
	const preview = useInvoiceImage(budgetId, clubId, itemId, file.id)
	const download = useDownloadInvoiceFile(budgetId, clubId)
	const isPdf = file.mimeType === 'application/pdf'

	async function saveToDisk() {
		try {
			const result = await download.mutateAsync({ itemId, imageId: file.id })
			triggerUrlDownload(result.url, result.fileName ?? file.fileName)
		} catch {
			/* Lỗi tải xuống được hiển thị bên dưới thẻ tệp. */
		}
	}

	return (
		<div className='flex flex-col justify-between rounded-lg border border-border-app bg-surface-app/40 p-2.5'>
			<div>
				{preview.isPending ? (
					<AppSkeleton className='h-28 w-full' />
				) : preview.isError ? (
					<p role='alert' className='text-sm text-danger-app'>
						{t('sponsoredItems.imageError')}
					</p>
				) : isPdf ? (
					<a
						href={preview.data?.url}
						target='_blank'
						rel='noreferrer'
						className='flex h-28 flex-col items-center justify-center gap-2 rounded-md border border-border-app bg-bg-app p-3 text-center hover:bg-surface-app'>
						<AppIcon name='file' className='size-8 text-primary-app' />
						<span className='text-xs font-medium text-muted-app'>
							{t('sponsoredItems.pdfFile')}
						</span>
					</a>
				) : (
					<a
						href={preview.data?.url}
						target='_blank'
						rel='noreferrer'
						className='block overflow-hidden rounded-md bg-bg-app'>
						<img
							src={preview.data?.url}
							alt={file.fileName}
							className='h-28 w-full object-contain'
						/>
					</a>
				)}
				<p className='mt-2 break-words text-xs font-medium text-text-app'>{file.fileName}</p>
			</div>
			<div className='mt-2 flex flex-wrap items-center gap-1.5'>
				{preview.data?.url && (
					<a
						href={preview.data.url}
						target='_blank'
						rel='noreferrer'
						className='inline-flex min-h-8 items-center gap-1 rounded-md border border-border-app bg-bg-app px-2.5 text-xs font-medium text-primary-app hover:bg-surface-app'>
						<AppIcon name='external' className='size-3.5' />
						{t('sponsoredItems.view')}
					</a>
				)}
				<AppButton
					type='button'
					variant='secondary'
					disabled={download.isPending}
					onClick={() => void saveToDisk()}
					className='min-h-8 px-2.5 text-xs'>
					<AppIcon name='download' className='size-3.5' />
					{download.isPending ? t('sponsoredItems.downloading') : t('sponsoredItems.download')}
				</AppButton>
				{editable && (
					<AppButton
						type='button'
						variant='ghost'
						disabled={busy}
						onClick={onRemove}
						className='min-h-8 px-2 text-xs'>
						{t('sponsoredItems.remove')}
					</AppButton>
				)}
			</div>
			{download.isError && (
				<p role='alert' className='mt-1.5 text-xs text-danger-app'>
					{t('sponsoredItems.downloadError')}
				</p>
			)}
		</div>
	)
}

// Thẻ một hạng mục tài trợ: tạm ứng trước sự kiện, chọn kênh sau sự kiện, thông tin NCC, chứng từ và duyệt
function ItemCard({
	budget,
	item,
	clubId,
	csrfToken,
}: {
	budget: SponsoredBudget
	item: SponsoredItem
	clubId?: string
	csrfToken: string
}) {
	const { t, i18n } = useTranslation()
	const confirm = useConfirm()
	const mutation = useSponsoredItemAction(budget.id, clubId, csrfToken)
	const downloadFile = useDownloadInvoiceFile(budget.id, clubId)

	const resolvedChannel = resolvePaymentChannel(item)
	const [selectedChannel, setSelectedChannel] = useState<'VIA_OFFICER_REIMBURSE' | 'DIRECT_VENDOR'>(
		resolvedChannel === 'DIRECT_VENDOR' ? 'DIRECT_VENDOR' : 'VIA_OFFICER_REIMBURSE',
	)
	const [amount, setAmount] = useState(String(item.amount))
	const [description, setDescription] = useState(item.description)
	const [vendor, setVendor] = useState<VendorBankInfo>(() => ({
		...EMPTY_VENDOR,
		...(item.vendorBankInfo ?? {}),
	}))
	const [valid, setValid] = useState(String(item.amount))
	const [reason, setReason] = useState('')
	const [progress, setProgress] = useState({ done: 0, total: 0 })
	const [refundProgress, setRefundProgress] = useState({ done: 0, total: 0 })
	const [showRefundPanel, setShowRefundPanel] = useState(false)
	const [refundNote, setRefundNote] = useState(item.refundNote ?? '')
	const [refundReason, setRefundReason] = useState('')
	const [copiedAccount, setCopiedAccount] = useState(false)
	const [downloadingAll, setDownloadingAll] = useState(false)
	const [downloadingRefundAll, setDownloadingRefundAll] = useState(false)
	const [error, setError] = useState('')

	const isClub = Boolean(clubId)
	const isOfficer = !isClub
	const refundProofs = item.refundProofs ?? []
	const canFetchRefundAccount =
		isClub &&
		item.fundingDecision === 'BEFORE_EVENT' &&
		(item.status === 'RefundPending' || item.status === 'RefundSubmitted') &&
		(item.refundAmount ?? 0) > 0
	const refundAccountQuery = useRefundAccount(
		budget.id,
		clubId,
		item.id,
		canFetchRefundAccount && showRefundPanel,
	)
	const deadline = new Date(new Date(item.eventEndAt).getTime() + 14 * 86_400_000)
	const now = new Date()
	const active = [
		'Approved',
		'Upcoming',
		'Ongoing',
		'Completed',
		'Report Submitted',
		'Closed',
	].includes(budget.eventState)
	const isBeforeEvent = item.fundingDecision === 'BEFORE_EVENT'
	const isAfterEvent = item.fundingDecision === 'AFTER_EVENT'
	const isNotSponsored = item.fundingDecision === 'NOT_SPONSORED'
	const requiresDirectVendor = isAfterEvent && item.approvedAmount >= DIRECT_VENDOR_THRESHOLD_VND
	const activeChannel = isBeforeEvent
		? 'VIA_OFFICER_ADVANCE'
		: isAfterEvent
			? requiresDirectVendor
				? 'DIRECT_VENDOR'
				: selectedChannel
			: undefined
	const usesDirectVendor = activeChannel === 'DIRECT_VENDOR'

	const editable =
		isClub && active && ['Draft', 'Returned'].includes(item.status) && now <= deadline
	const expired = ['Draft', 'Returned'].includes(item.status) && now > deadline
	const showInvoiceSection =
		!isNotSponsored &&
		(!isBeforeEvent ||
			Boolean(item.advanceReceivedAt) ||
			!['AwaitingAdvance', 'AdvanceSent'].includes(item.status))

	const vendorReady = !usesDirectVendor || isVendorInfoComplete(item.vendorBankInfo)
	const canSubmit =
		editable &&
		!isNotSponsored &&
		(!isBeforeEvent || Boolean(item.advanceReceivedAt)) &&
		now >= new Date(item.eventEndAt) &&
		item.images.length > 0 &&
		item.amount > 0 &&
		vendorReady

	const channelDirty =
		isAfterEvent &&
		!requiresDirectVendor &&
		selectedChannel !== (resolvedChannel ?? 'VIA_OFFICER_REIMBURSE')
	const vendorDirty = usesDirectVendor && !sameVendorInfo(item.vendorBankInfo, vendor)
	const dirty =
		Number(amount) !== item.amount ||
		description !== item.description ||
		channelDirty ||
		vendorDirty

	function money(value: number) {
		return new Intl.NumberFormat(i18n.language, {
			style: 'currency',
			currency: 'VND',
			maximumFractionDigits: 0,
		}).format(value)
	}

	function formatDateTime(value: string) {
		return new Date(value).toLocaleString(i18n.language)
	}

	async function act(action: ItemAction) {
		setError('')
		try {
			await mutation.mutateAsync({ itemId: item.id, revision: budget.revision, action })
		} catch (err) {
			setError(err instanceof Error && err.message ? err.message : t('sponsoredItems.error'))
		}
	}

	async function saveDraft() {
		if (usesDirectVendor && !isVendorInfoComplete(vendor)) {
			setError(t('sponsoredItems.vendorRequiredError'))
			return
		}
		const vendorPayload: VendorBankInfo | undefined = usesDirectVendor
			? {
					vendorName: vendor.vendorName.trim(),
					accountHolder: vendor.accountHolder.trim(),
					accountNumber: vendor.accountNumber.trim(),
					bankName: vendor.bankName.trim(),
					...(vendor.bankBranch?.trim() ? { bankBranch: vendor.bankBranch.trim() } : {}),
					...(vendor.transferNote?.trim() ? { transferNote: vendor.transferNote.trim() } : {}),
				}
			: undefined
		await act({
			kind: 'save',
			amount: Number(amount),
			description,
			...(isAfterEvent
				? { paymentChannel: requiresDirectVendor ? 'DIRECT_VENDOR' : selectedChannel }
				: {}),
			...(vendorPayload ? { vendorBankInfo: vendorPayload } : {}),
		})
	}

	async function upload(files: File[]) {
		if (!editable || mutation.isPending) return
		setError('')
		if (
			!files.length ||
			item.images.length + files.length > 5 ||
			files.some((file) => !isAllowedAttachment(file))
		) {
			setError(t('sponsoredItems.invalidImages'))
			return
		}
		setProgress({ done: 0, total: files.length })
		try {
			await mutation.mutateAsync({
				itemId: item.id,
				revision: budget.revision,
				files,
				onProgress: (done) => setProgress({ done, total: files.length }),
			})
		} catch (err) {
			setError(err instanceof Error && err.message ? err.message : t('sponsoredItems.error'))
		} finally {
			setProgress({ done: 0, total: 0 })
		}
	}

	async function downloadAllFiles() {
		if (downloadingAll || !item.images.length) return
		setError('')
		setDownloadingAll(true)
		try {
			for (const file of item.images) {
				const result = await downloadFile.mutateAsync({ itemId: item.id, imageId: file.id })
				triggerUrlDownload(result.url, result.fileName ?? file.fileName)
			}
		} catch {
			setError(t('sponsoredItems.downloadError'))
		} finally {
			setDownloadingAll(false)
		}
	}

	async function uploadRefundProofs(files: File[]) {
		if (!isClub || !active || item.status !== 'RefundPending' || mutation.isPending) return
		setError('')
		if (
			!files.length ||
			refundProofs.length + files.length > 5 ||
			files.some((file) => !isAllowedAttachment(file))
		) {
			setError(t('sponsoredItems.invalidImages'))
			return
		}
		setRefundProgress({ done: 0, total: files.length })
		try {
			await mutation.mutateAsync({
				itemId: item.id,
				revision: budget.revision,
				files,
				target: 'refund',
				onProgress: (done) => setRefundProgress({ done, total: files.length }),
			})
		} catch (err) {
			setError(err instanceof Error && err.message ? err.message : t('sponsoredItems.error'))
		} finally {
			setRefundProgress({ done: 0, total: 0 })
		}
	}

	async function downloadAllRefundProofs() {
		if (downloadingRefundAll || !refundProofs.length) return
		setError('')
		setDownloadingRefundAll(true)
		try {
			for (const file of refundProofs) {
				const result = await downloadFile.mutateAsync({ itemId: item.id, imageId: file.id })
				triggerUrlDownload(result.url, result.fileName ?? file.fileName)
			}
		} catch {
			setError(t('sponsoredItems.downloadError'))
		} finally {
			setDownloadingRefundAll(false)
		}
	}

	async function copyAccountNumber(accountNumber: string) {
		try {
			await navigator.clipboard.writeText(accountNumber)
			setCopiedAccount(true)
			window.setTimeout(() => setCopiedAccount(false), 2000)
		} catch {
			/* Trình duyệt không cấp quyền clipboard; người dùng có thể tự bôi đen sao chép. */
		}
	}

	return (
		<article className='rounded-xl border border-border-app bg-bg-app p-4 sm:p-5'>
			<header className='flex flex-wrap items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h4 className='font-semibold text-text-app break-words'>{item.category}</h4>
					<p className='mt-1 text-sm text-primary-app'>
						{t(`sponsoredItems.${item.fundingDecision}`)}
					</p>
					{activeChannel && (
						<p className='mt-0.5 text-xs text-muted-app'>
							{t(`sponsoredItems.channel_${activeChannel}`)}
						</p>
					)}
				</div>
				<span className='rounded-full bg-primary-app/10 px-3 py-1 text-sm font-medium text-primary-app'>
					{t(`sponsoredItems.${expired ? 'Expired' : item.status}`)}
				</span>
			</header>

			<p className='mt-3 text-sm'>
				{t('sponsoredItems.cap')}:{' '}
				<strong className='tabular-nums'>{money(item.approvedAmount)}</strong>
			</p>
			{item.reason && <p className='mt-1 text-sm text-muted-app'>{item.reason}</p>}

			{!isNotSponsored && (
				<div className='mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-app'>
					<p>
						{t('sponsoredItems.opens')}: {formatDateTime(item.eventEndAt)}
					</p>
					<p>
						{t('sponsoredItems.deadline')}: {deadline.toLocaleString(i18n.language)}
					</p>
				</div>
			)}

			{/* Giai đoạn tạm ứng trước sự kiện cho BEFORE_EVENT (không cần hóa đơn trước) */}
			{isBeforeEvent && item.status === 'AwaitingAdvance' && (
				<div className='mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4'>
					<p className='text-sm text-text-app'>{t('sponsoredItems.advancePendingOfficer')}</p>
					{isOfficer && active && (
						<AppButton
							type='button'
							disabled={mutation.isPending}
							onClick={async () => {
								if (
									await confirm(
										t('sponsoredItems.recordAdvanceConfirm', {
											amount: money(item.approvedAmount),
										}),
									)
								) {
									await act({ kind: 'recordAdvance' })
								}
							}}>
							{t('sponsoredItems.recordAdvance')}
						</AppButton>
					)}
				</div>
			)}

			{isBeforeEvent && item.status === 'AdvanceSent' && (
				<div className='mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4'>
					<p className='text-sm text-text-app'>
						{t(
							isClub ? 'sponsoredItems.advanceSentNotice' : 'sponsoredItems.advanceSentWaitingClub',
							{
								amount: money(item.advanceAmount ?? item.approvedAmount),
								date: item.advancedAt ? formatDateTime(item.advancedAt) : '',
							},
						)}
					</p>
					{isClub && active && (
						<AppButton
							type='button'
							disabled={mutation.isPending}
							onClick={async () => {
								if (
									await confirm(
										t('sponsoredItems.confirmAdvanceReceivedConfirm', {
											amount: money(item.advanceAmount ?? item.approvedAmount),
										}),
									)
								) {
									await act({ kind: 'confirmAdvanceReceived' })
								}
							}}>
							{t('sponsoredItems.confirmAdvanceReceived')}
						</AppButton>
					)}
				</div>
			)}

			{isBeforeEvent && item.advanceReceivedAt && (
				<div className='mt-4'>
					<AppNotice>
						{t('sponsoredItems.advanceReceivedSummary', {
							amount: money(item.advanceAmount ?? item.approvedAmount),
							date: formatDateTime(item.advanceReceivedAt),
						})}
					</AppNotice>
				</div>
			)}

			{/* Lựa chọn hình thức giải ngân cho khoản trả sau dưới 5 triệu (chỉ phía CLB chọn khi còn chỉnh sửa) */}
			{isClub && isAfterEvent && !requiresDirectVendor && (
				<fieldset className='mt-4 rounded-xl border border-border-app bg-surface-app/60 p-3.5'>
					<legend className='px-1 text-xs font-semibold text-text-app'>
						{t('sponsoredItems.channelSelectLabel')}
					</legend>
					<div className='mt-2 space-y-2 text-sm'>
						{(['VIA_OFFICER_REIMBURSE', 'DIRECT_VENDOR'] as const).map((option) => (
							<label
								key={option}
								className={cn('flex items-start gap-2.5 rounded-lg p-2', {
									'bg-bg-app': activeChannel === option,
									'opacity-75': !editable,
								})}>
								<input
									type='radio'
									name={`channel-${item.id}`}
									value={option}
									checked={selectedChannel === option}
									disabled={!editable || mutation.isPending}
									onChange={() => setSelectedChannel(option)}
									className='mt-0.5 size-4 accent-primary-app'
								/>
								<span className='text-text-app'>
									{t(
										option === 'VIA_OFFICER_REIMBURSE'
											? 'sponsoredItems.channelSelfPaidOption'
											: 'sponsoredItems.channelDirectVendorOption',
									)}
								</span>
							</label>
						))}
					</div>
				</fieldset>
			)}

			{/* Khu vực chi phí, thông tin chuyển khoản nhà cung cấp và tệp chứng từ */}
			{showInvoiceSection && (
				<>
					{isClub ? (
						<>
							<div className='mt-4 grid gap-4 sm:grid-cols-2'>
								<label className='text-sm font-medium text-text-app'>
									{t('sponsoredItems.amount')}
									<AppMoneyInput
										value={amount}
										onValueChange={setAmount}
										disabled={!editable || mutation.isPending}
										className='mt-1 w-full font-normal'
									/>
								</label>
								<label className='text-sm font-medium text-text-app'>
									{t('sponsoredItems.description')}
									<AppTextarea
										value={description}
										onChange={(event) => setDescription(event.target.value)}
										disabled={!editable || mutation.isPending}
										maxLength={2000}
										className='mt-1 w-full font-normal'
									/>
								</label>
							</div>

							{usesDirectVendor && (
								<section className='mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app/50 p-4'>
									<div>
										<h5 className='text-sm font-semibold text-text-app'>
											{t('sponsoredItems.vendorSectionTitle')}
										</h5>
									</div>
									<div className='grid gap-3 sm:grid-cols-2'>
										<label className='text-sm text-text-app'>
											{t('sponsoredItems.vendorName')}
											<AppInput
												value={vendor.vendorName}
												maxLength={200}
												disabled={!editable || mutation.isPending}
												onChange={(event) =>
													setVendor((prev) => ({ ...prev, vendorName: event.target.value }))
												}
												className='mt-1 w-full'
											/>
										</label>
										<label className='text-sm text-text-app'>
											{t('sponsoredItems.accountHolder')}
											<AppInput
												value={vendor.accountHolder}
												maxLength={200}
												disabled={!editable || mutation.isPending}
												onChange={(event) =>
													setVendor((prev) => ({ ...prev, accountHolder: event.target.value }))
												}
												className='mt-1 w-full'
											/>
										</label>
										<label className='text-sm text-text-app'>
											{t('sponsoredItems.accountNumber')}
											<AppInput
												value={vendor.accountNumber}
												maxLength={50}
												disabled={!editable || mutation.isPending}
												onChange={(event) =>
													setVendor((prev) => ({ ...prev, accountNumber: event.target.value }))
												}
												className='mt-1 w-full tabular-nums'
											/>
										</label>
										<label className='text-sm text-text-app'>
											{t('sponsoredItems.bankName')}
											<AppInput
												value={vendor.bankName}
												maxLength={200}
												disabled={!editable || mutation.isPending}
												onChange={(event) =>
													setVendor((prev) => ({ ...prev, bankName: event.target.value }))
												}
												className='mt-1 w-full'
											/>
										</label>
										<label className='text-sm text-text-app'>
											{t('sponsoredItems.bankBranch')}
											<AppInput
												value={vendor.bankBranch ?? ''}
												maxLength={200}
												disabled={!editable || mutation.isPending}
												onChange={(event) =>
													setVendor((prev) => ({ ...prev, bankBranch: event.target.value }))
												}
												className='mt-1 w-full'
											/>
										</label>
										<label className='text-sm text-text-app'>
											{t('sponsoredItems.transferNote')}
											<AppInput
												value={vendor.transferNote ?? ''}
												maxLength={500}
												disabled={!editable || mutation.isPending}
												onChange={(event) =>
													setVendor((prev) => ({ ...prev, transferNote: event.target.value }))
												}
												className='mt-1 w-full'
											/>
										</label>
									</div>
								</section>
							)}

							{editable && (
								<AppButton
									type='button'
									className='mt-3'
									disabled={mutation.isPending || !dirty || Number(amount) <= 0}
									onClick={() => void saveDraft()}>
									{t('sponsoredItems.save')}
								</AppButton>
							)}
						</>
					) : (
						<>
							<dl className='mt-4 grid gap-3 rounded-xl border border-border-app bg-surface-app/40 p-4 text-sm sm:grid-cols-2'>
								<div>
									<dt className='text-xs text-muted-app'>{t('sponsoredItems.amount')}</dt>
									<dd className='mt-1 font-semibold tabular-nums text-text-app'>
										{item.amount > 0 ? money(item.amount) : t('sponsoredItems.notEntered')}
									</dd>
								</div>
								<div>
									<dt className='text-xs text-muted-app'>{t('sponsoredItems.description')}</dt>
									<dd className='mt-1 whitespace-pre-wrap break-words text-text-app'>
										{item.description || t('sponsoredItems.notEntered')}
									</dd>
								</div>
							</dl>

							{usesDirectVendor && (
								<section className='mt-4 space-y-2 rounded-xl border border-border-app bg-surface-app/50 p-4'>
									<div>
										<h5 className='text-sm font-semibold text-text-app'>
											{t('sponsoredItems.vendorSectionTitle')}
										</h5>
									</div>
									{item.vendorBankInfo ? (
										<dl className='grid gap-3 pt-1 text-sm sm:grid-cols-2'>
											<div>
												<dt className='text-xs text-muted-app'>{t('sponsoredItems.vendorName')}</dt>
												<dd className='mt-0.5 font-medium break-words text-text-app'>
													{item.vendorBankInfo.vendorName}
												</dd>
											</div>
											<div>
												<dt className='text-xs text-muted-app'>
													{t('sponsoredItems.accountHolder')}
												</dt>
												<dd className='mt-0.5 font-medium break-words text-text-app'>
													{item.vendorBankInfo.accountHolder}
												</dd>
											</div>
											<div>
												<dt className='text-xs text-muted-app'>
													{t('sponsoredItems.accountNumber')}
												</dt>
												<dd className='mt-0.5 font-semibold tabular-nums text-text-app'>
													{item.vendorBankInfo.accountNumber}
												</dd>
											</div>
											<div>
												<dt className='text-xs text-muted-app'>{t('sponsoredItems.bankName')}</dt>
												<dd className='mt-0.5 font-medium break-words text-text-app'>
													{item.vendorBankInfo.bankName}
												</dd>
											</div>
											{item.vendorBankInfo.bankBranch && (
												<div>
													<dt className='text-xs text-muted-app'>
														{t('sponsoredItems.bankBranch')}
													</dt>
													<dd className='mt-0.5 break-words text-text-app'>
														{item.vendorBankInfo.bankBranch}
													</dd>
												</div>
											)}
											{item.vendorBankInfo.transferNote && (
												<div>
													<dt className='text-xs text-muted-app'>
														{t('sponsoredItems.transferNote')}
													</dt>
													<dd className='mt-0.5 break-words text-text-app'>
														{item.vendorBankInfo.transferNote}
													</dd>
												</div>
											)}
										</dl>
									) : (
										<p className='text-sm text-muted-app'>{t('sponsoredItems.notEntered')}</p>
									)}
								</section>
							)}
						</>
					)}

					{/* Chứng từ: CLB được tải lên khi editable; ICPDP chỉ xem và lưu về máy */}
					<div
						className={cn('mt-5 rounded-xl border border-border-app p-4', {
							'border-dashed': editable,
							'bg-surface-app/30': !editable,
						})}
						onDragOver={editable ? (event) => event.preventDefault() : undefined}
						onDrop={
							editable
								? (event) => {
										event.preventDefault()
										void upload(Array.from(event.dataTransfer.files))
									}
								: undefined
						}>
						<div className='flex flex-wrap items-center justify-between gap-2'>
							<div>
								<p className='text-sm font-medium text-text-app'>
									{t(isOfficer ? 'sponsoredItems.officerImages' : 'sponsoredItems.images')} ·{' '}
									{item.images.length}/5
								</p>
								{editable && (
									<p className='mt-1 text-xs text-muted-app'>{t('sponsoredItems.imageHint')}</p>
								)}
							</div>
							{isOfficer && item.images.length > 0 && (
								<AppButton
									type='button'
									variant='secondary'
									disabled={downloadingAll}
									onClick={() => void downloadAllFiles()}>
									<AppIcon name='download' className='size-4' />
									{downloadingAll
										? t('sponsoredItems.downloading')
										: t('sponsoredItems.downloadAll')}
								</AppButton>
							)}
						</div>
						{item.images.length > 0 ? (
							<div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
								{item.images.map((file) => (
									<AttachmentCard
										key={file.id}
										budgetId={budget.id}
										clubId={clubId}
										itemId={item.id}
										file={file}
										editable={editable}
										busy={mutation.isPending}
										onRemove={() => void act({ kind: 'removeImage', imageId: file.id })}
									/>
								))}
							</div>
						) : !editable ? (
							<p className='mt-2 text-sm text-muted-app'>{t('sponsoredItems.noAttachmentsYet')}</p>
						) : null}
						{editable && item.images.length < 5 && (
							<label className='relative mt-3 inline-flex min-h-10 items-center rounded-lg border border-border-app bg-surface-app px-4 text-sm font-medium text-primary-app hover:bg-surface-strong-app focus-within:outline-2 focus-within:outline-ring-app'>
								{t('sponsoredItems.upload')}
								<input
									type='file'
									accept='image/jpeg,image/png,application/pdf'
									multiple
									disabled={mutation.isPending}
									className='sr-only'
									onChange={(event) => {
										void upload(Array.from(event.target.files ?? []))
										event.target.value = ''
									}}
								/>
							</label>
						)}
						{editable && progress.total > 0 && (
							<p role='status' className='mt-2 text-sm text-muted-app'>
								{t('sponsoredItems.progress', progress)}
							</p>
						)}
					</div>

					{isClub && (
						<AppButton
							type='button'
							className='mt-4'
							disabled={!canSubmit || dirty || mutation.isPending}
							onClick={async () => {
								if (await confirm(t('sponsoredItems.submitConfirm'))) await act({ kind: 'submit' })
							}}>
							{t('sponsoredItems.submit')}
						</AppButton>
					)}
				</>
			)}

			{/* Kết quả đối soát của ICPDP */}
			{item.reviewReason && (
				<p className='mt-4 whitespace-pre-wrap text-sm text-text-app'>{item.reviewReason}</p>
			)}
			{item.payable !== undefined && (
				<div className='mt-3 space-y-1 text-sm'>
					<p className='font-semibold tabular-nums'>
						{t(isBeforeEvent ? 'sponsoredItems.acceptedAfterAdvance' : 'sponsoredItems.payable')}:{' '}
						{money(item.payable)}
					</p>
					{isBeforeEvent && item.reconciliationDelta !== undefined && (
						<p
							className={cn('text-sm', {
								'text-warning-app': item.reconciliationDelta < 0,
								'text-success-app': item.reconciliationDelta >= 0,
							})}>
							{item.reconciliationDelta < 0
								? t('sponsoredItems.reconciliationDeltaShort', {
										amount: money(Math.abs(item.reconciliationDelta)),
									})
								: t('sponsoredItems.reconciliationDeltaExact')}
						</p>
					)}
				</div>
			)}

			{/* Form đối soát của ICPDP khi hồ sơ ở trạng thái Submitted */}
			{isOfficer && active && item.status === 'Submitted' && (
				<div className='mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app/40 p-4'>
					<label className='block text-sm font-medium text-text-app'>
						{t('sponsoredItems.valid')}
						<AppMoneyInput
							value={valid}
							onValueChange={setValid}
							className='mt-1 w-full font-normal'
						/>
					</label>
					<label className='block text-sm font-medium text-text-app'>
						{t('sponsoredItems.reason')}
						<AppTextarea
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							maxLength={2000}
							className='mt-1 w-full font-normal'
						/>
					</label>
					<div className='flex flex-wrap gap-2'>
						<AppButton
							type='button'
							disabled={mutation.isPending || !reason.trim()}
							onClick={() => void act({ kind: 'review', validAmount: Number(valid), reason })}>
							{t('sponsoredItems.review')}
						</AppButton>
						<AppButton
							type='button'
							variant='ghost'
							disabled={mutation.isPending || !reason.trim() || now >= deadline}
							onClick={() => void act({ kind: 'return', reason })}>
							{t('sponsoredItems.return')}
						</AppButton>
					</div>
				</div>
			)}

			{/* Hoàn trả tiền dư tạm ứng về tài khoản nhà trường (BEFORE_EVENT có payable < advanceAmount) */}
			{isBeforeEvent && item.status === 'RefundPending' && (item.refundAmount ?? 0) > 0 && (
				<section className='mt-4 space-y-4 rounded-xl border border-warning-app/40 bg-surface-app/60 p-4'>
					<AppNotice tone='warning'>
						{t(
							isClub
								? 'sponsoredItems.refundRequiredBanner'
								: 'sponsoredItems.refundWaitingClubOfficer',
							{ amount: money(item.refundAmount!) },
						)}
					</AppNotice>
					{item.refundReviewReason && (
						<AppNotice tone='danger'>
							<strong>{t('sponsoredItems.refundReturnedReason')}:</strong>{' '}
							<span className='whitespace-pre-wrap'>{item.refundReviewReason}</span>
						</AppNotice>
					)}
					{isClub && active && (
						<>
							<div className='flex flex-wrap items-center gap-2'>
								<AppButton
									type='button'
									variant={showRefundPanel ? 'secondary' : 'primary'}
									onClick={() => setShowRefundPanel((open) => !open)}>
									{t(
										showRefundPanel
											? 'sponsoredItems.refundHideAccount'
											: 'sponsoredItems.refundStartButton',
									)}
								</AppButton>
							</div>
							{showRefundPanel && (
								<div className='space-y-4 rounded-xl border border-border-app bg-bg-app p-4'>
									<div>
										<h5 className='text-sm font-semibold text-text-app'>
											{t('sponsoredItems.refundAccountTitle')}
										</h5>
										<p className='mt-0.5 text-xs text-muted-app'>
											{t('sponsoredItems.refundAccountHint')}
										</p>
									</div>

									{refundAccountQuery.isPending ? (
										<AppSkeleton className='h-24 w-full' />
									) : refundAccountQuery.isError ? (
										<AppNotice tone='danger' role='alert'>
											{t('sponsoredItems.refundAccountNotConfigured')}
										</AppNotice>
									) : refundAccountQuery.data ? (
										<dl className='grid gap-3 rounded-lg border border-border-app bg-surface-app/50 p-3.5 text-sm sm:grid-cols-2'>
											<div>
												<dt className='text-xs text-muted-app'>
													{t('sponsoredItems.refundAmountDue')}
												</dt>
												<dd className='mt-0.5 font-semibold tabular-nums text-warning-app'>
													{money(refundAccountQuery.data.refundAmount)}
												</dd>
											</div>
											<div>
												<dt className='text-xs text-muted-app'>
													{t('sponsoredItems.accountHolder')}
												</dt>
												<dd className='mt-0.5 font-medium break-words text-text-app'>
													{refundAccountQuery.data.account.accountHolder}
												</dd>
											</div>
											<div>
												<dt className='text-xs text-muted-app'>
													{t('sponsoredItems.accountNumber')}
												</dt>
												<dd className='mt-0.5 flex flex-wrap items-center gap-2'>
													<span className='font-semibold tabular-nums text-text-app'>
														{refundAccountQuery.data.account.accountNumber}
													</span>
													<AppButton
														type='button'
														variant='secondary'
														className='min-h-7 px-2 text-xs'
														onClick={() =>
															void copyAccountNumber(refundAccountQuery.data.account.accountNumber)
														}>
														<AppIcon
															name={copiedAccount ? 'check' : 'clipboard'}
															className='size-3.5'
														/>
														{t(
															copiedAccount
																? 'sponsoredItems.refundCopied'
																: 'sponsoredItems.refundCopyAccount',
														)}
													</AppButton>
												</dd>
											</div>
											<div>
												<dt className='text-xs text-muted-app'>{t('sponsoredItems.bankName')}</dt>
												<dd className='mt-0.5 font-medium break-words text-text-app'>
													{refundAccountQuery.data.account.bankName}
												</dd>
											</div>
											{refundAccountQuery.data.account.bankBranch && (
												<div>
													<dt className='text-xs text-muted-app'>
														{t('sponsoredItems.bankBranch')}
													</dt>
													<dd className='mt-0.5 break-words text-text-app'>
														{refundAccountQuery.data.account.bankBranch}
													</dd>
												</div>
											)}
											{refundAccountQuery.data.account.transferNote && (
												<div className='sm:col-span-2'>
													<dt className='text-xs text-muted-app'>
														{t('sponsoredItems.transferNote')}
													</dt>
													<dd className='mt-0.5 break-words text-text-app'>
														{refundAccountQuery.data.account.transferNote}
													</dd>
												</div>
											)}
										</dl>
									) : null}

									<div
										className='rounded-xl border border-dashed border-border-app p-4'
										onDragOver={(event) => event.preventDefault()}
										onDrop={(event) => {
											event.preventDefault()
											void uploadRefundProofs(Array.from(event.dataTransfer.files))
										}}>
										<p className='text-sm font-medium text-text-app'>
											{t('sponsoredItems.refundProofsLabel')} · {refundProofs.length}/5
										</p>
										<p className='mt-1 text-xs text-muted-app'>
											{t('sponsoredItems.refundProofsHint')}
										</p>
										{refundProofs.length > 0 && (
											<div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
												{refundProofs.map((file) => (
													<AttachmentCard
														key={file.id}
														budgetId={budget.id}
														clubId={clubId}
														itemId={item.id}
														file={file}
														editable={active}
														busy={mutation.isPending}
														onRemove={() =>
															void act({ kind: 'removeRefundImage', imageId: file.id })
														}
													/>
												))}
											</div>
										)}
										{refundProofs.length < 5 && (
											<label className='relative mt-3 inline-flex min-h-10 items-center rounded-lg border border-border-app bg-surface-app px-4 text-sm font-medium text-primary-app hover:bg-surface-strong-app focus-within:outline-2 focus-within:outline-ring-app'>
												{t('sponsoredItems.refundProofsUpload')}
												<input
													type='file'
													accept='image/jpeg,image/png,application/pdf'
													multiple
													disabled={mutation.isPending}
													className='sr-only'
													onChange={(event) => {
														void uploadRefundProofs(Array.from(event.target.files ?? []))
														event.target.value = ''
													}}
												/>
											</label>
										)}
										{refundProgress.total > 0 && (
											<p role='status' className='mt-2 text-sm text-muted-app'>
												{t('sponsoredItems.progress', refundProgress)}
											</p>
										)}
									</div>

									<label className='block text-sm font-medium text-text-app'>
										{t('sponsoredItems.refundNoteLabel')}
										<AppTextarea
											value={refundNote}
											onChange={(event) => setRefundNote(event.target.value)}
											placeholder={t('sponsoredItems.refundNotePlaceholder')}
											maxLength={2000}
											disabled={mutation.isPending}
											className='mt-1 w-full font-normal'
										/>
									</label>

									<AppButton
										type='button'
										disabled={mutation.isPending || refundProofs.length === 0}
										onClick={async () => {
											if (
												await confirm(
													t('sponsoredItems.submitRefundConfirm', {
														amount: money(item.refundAmount!),
													}),
												)
											) {
												await act({
													kind: 'submitRefund',
													...(refundNote.trim() ? { note: refundNote.trim() } : {}),
												})
											}
										}}>
										{t('sponsoredItems.submitRefund')}
									</AppButton>
								</div>
							)}
						</>
					)}
				</section>
			)}

			{isBeforeEvent && item.status === 'RefundSubmitted' && (item.refundAmount ?? 0) > 0 && (
				<section className='mt-4 space-y-4 rounded-xl border border-primary-app/30 bg-surface-app/60 p-4'>
					{isClub ? (
						<>
							<AppNotice>
								{t('sponsoredItems.refundSubmittedClubNotice', {
									amount: money(item.refundAmount!),
									date: item.refundSubmittedAt ? formatDateTime(item.refundSubmittedAt) : '',
								})}
							</AppNotice>
							{item.refundNote && (
								<p className='text-sm text-text-app'>
									<span className='text-muted-app'>{t('sponsoredItems.refundClubNote')}: </span>
									<span className='whitespace-pre-wrap'>{item.refundNote}</span>
								</p>
							)}
							{refundProofs.length > 0 && (
								<div>
									<p className='text-sm font-medium text-text-app'>
										{t('sponsoredItems.refundProofsLabel')} · {refundProofs.length}/5
									</p>
									<div className='mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
										{refundProofs.map((file) => (
											<AttachmentCard
												key={file.id}
												budgetId={budget.id}
												clubId={clubId}
												itemId={item.id}
												file={file}
												editable={false}
												busy={mutation.isPending}
												onRemove={() => {}}
											/>
										))}
									</div>
								</div>
							)}
							<div>
								<AppButton
									type='button'
									variant='secondary'
									onClick={() => setShowRefundPanel((open) => !open)}>
									{t(
										showRefundPanel
											? 'sponsoredItems.refundHideAccount'
											: 'sponsoredItems.refundShowAccountAgain',
									)}
								</AppButton>
								{showRefundPanel && (
									<div className='mt-3'>
										{refundAccountQuery.isPending ? (
											<AppSkeleton className='h-20 w-full' />
										) : refundAccountQuery.isError ? (
											<AppNotice tone='danger' role='alert'>
												{t('sponsoredItems.refundAccountNotConfigured')}
											</AppNotice>
										) : refundAccountQuery.data ? (
											<dl className='grid gap-3 rounded-lg border border-border-app bg-bg-app p-3.5 text-sm sm:grid-cols-2'>
												<div>
													<dt className='text-xs text-muted-app'>
														{t('sponsoredItems.accountHolder')}
													</dt>
													<dd className='mt-0.5 font-medium break-words text-text-app'>
														{refundAccountQuery.data.account.accountHolder}
													</dd>
												</div>
												<div>
													<dt className='text-xs text-muted-app'>
														{t('sponsoredItems.accountNumber')}
													</dt>
													<dd className='mt-0.5 font-semibold tabular-nums text-text-app'>
														{refundAccountQuery.data.account.accountNumber}
													</dd>
												</div>
												<div>
													<dt className='text-xs text-muted-app'>{t('sponsoredItems.bankName')}</dt>
													<dd className='mt-0.5 break-words text-text-app'>
														{refundAccountQuery.data.account.bankName}
													</dd>
												</div>
												{refundAccountQuery.data.account.bankBranch && (
													<div>
														<dt className='text-xs text-muted-app'>
															{t('sponsoredItems.bankBranch')}
														</dt>
														<dd className='mt-0.5 break-words text-text-app'>
															{refundAccountQuery.data.account.bankBranch}
														</dd>
													</div>
												)}
											</dl>
										) : null}
									</div>
								)}
							</div>
						</>
					) : (
						<>
							<div className='flex flex-wrap items-center justify-between gap-2'>
								<div>
									<h5 className='text-sm font-semibold text-text-app'>
										{t('sponsoredItems.refundSubmittedOfficerTitle')}
									</h5>
									<p className='mt-0.5 text-sm tabular-nums text-muted-app'>
										{t('sponsoredItems.refundAmountDue')}:{' '}
										<strong className='text-text-app'>{money(item.refundAmount!)}</strong>
										{item.refundSubmittedAt ? ` · ${formatDateTime(item.refundSubmittedAt)}` : ''}
									</p>
								</div>
								{refundProofs.length > 0 && (
									<AppButton
										type='button'
										variant='secondary'
										disabled={downloadingRefundAll}
										onClick={() => void downloadAllRefundProofs()}>
										<AppIcon name='download' className='size-4' />
										{downloadingRefundAll
											? t('sponsoredItems.downloading')
											: t('sponsoredItems.refundProofsDownloadAll')}
									</AppButton>
								)}
							</div>
							{item.refundNote && (
								<p className='text-sm text-text-app'>
									<span className='text-muted-app'>{t('sponsoredItems.refundClubNote')}: </span>
									<span className='whitespace-pre-wrap'>{item.refundNote}</span>
								</p>
							)}
							{refundProofs.length > 0 && (
								<div>
									<p className='text-sm font-medium text-text-app'>
										{t('sponsoredItems.refundProofsOfficerLabel')} · {refundProofs.length}/5
									</p>
									<div className='mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
										{refundProofs.map((file) => (
											<AttachmentCard
												key={file.id}
												budgetId={budget.id}
												clubId={clubId}
												itemId={item.id}
												file={file}
												editable={false}
												busy={mutation.isPending}
												onRemove={() => {}}
											/>
										))}
									</div>
								</div>
							)}
							{active && (
								<div className='space-y-3 border-t border-border-app pt-3'>
									<label className='block text-sm font-medium text-text-app'>
										{t('sponsoredItems.refundReviewReasonLabel')}
										<AppTextarea
											value={refundReason}
											onChange={(event) => setRefundReason(event.target.value)}
											maxLength={2000}
											disabled={mutation.isPending}
											className='mt-1 w-full font-normal'
										/>
									</label>
									<div className='flex flex-wrap gap-2'>
										<AppButton
											type='button'
											disabled={mutation.isPending}
											onClick={async () => {
												if (
													await confirm(
														t('sponsoredItems.confirmRefundConfirm', {
															amount: money(item.refundAmount!),
														}),
													)
												) {
													await act({
														kind: 'confirmRefund',
														...(refundReason.trim() ? { reason: refundReason.trim() } : {}),
													})
												}
											}}>
											{t('sponsoredItems.confirmRefund')}
										</AppButton>
										<AppButton
											type='button'
											variant='ghost'
											disabled={mutation.isPending || !refundReason.trim()}
											onClick={() =>
												void act({ kind: 'returnRefund', reason: refundReason.trim() })
											}>
											{t('sponsoredItems.returnRefund')}
										</AppButton>
									</div>
								</div>
							)}
						</>
					)}
				</section>
			)}

			{isBeforeEvent && item.refundConfirmedAt && (item.refundAmount ?? 0) > 0 && (
				<section className='mt-4 space-y-3 rounded-xl border border-success-app/30 bg-surface-app/40 p-4'>
					<div className='flex flex-wrap items-center justify-between gap-2'>
						<p className='text-sm font-medium text-success-app'>
							{t('sponsoredItems.refundConfirmedDone', {
								amount: money(item.refundAmount!),
								date: formatDateTime(item.refundConfirmedAt),
							})}
						</p>
						{isOfficer && refundProofs.length > 0 && (
							<AppButton
								type='button'
								variant='secondary'
								disabled={downloadingRefundAll}
								onClick={() => void downloadAllRefundProofs()}>
								<AppIcon name='download' className='size-4' />
								{downloadingRefundAll
									? t('sponsoredItems.downloading')
									: t('sponsoredItems.refundProofsDownloadAll')}
							</AppButton>
						)}
					</div>
					{item.refundReviewReason && (
						<p className='whitespace-pre-wrap text-sm text-text-app'>{item.refundReviewReason}</p>
					)}
					{refundProofs.length > 0 && (
						<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
							{refundProofs.map((file) => (
								<AttachmentCard
									key={file.id}
									budgetId={budget.id}
									clubId={clubId}
									itemId={item.id}
									file={file}
									editable={false}
									busy={mutation.isPending}
									onRemove={() => {}}
								/>
							))}
						</div>
					)}
				</section>
			)}

			{/* Bước hoàn tất thanh toán sau đối soát (tách riêng theo kênh) */}
			{active &&
				item.status === 'Accepted' &&
				activeChannel === 'VIA_OFFICER_REIMBURSE' &&
				(isClub ? (
					<AppButton
						type='button'
						className='mt-4'
						disabled={mutation.isPending}
						onClick={async () => {
							if (await confirm(t('sponsoredItems.payConfirm', { amount: money(item.payable!) }))) {
								await act({ kind: 'pay' })
							}
						}}>
						{t('sponsoredItems.pay')}
					</AppButton>
				) : (
					<div className='mt-4'>
						<AppNotice>
							{t('sponsoredItems.officerReimburseWaitingClub', {
								amount: money(item.payable ?? 0),
							})}
						</AppNotice>
					</div>
				))}

			{active &&
				item.status === 'Accepted' &&
				activeChannel === 'DIRECT_VENDOR' &&
				(isOfficer ? (
					<AppButton
						type='button'
						className='mt-4'
						disabled={mutation.isPending}
						onClick={async () => {
							if (
								await confirm(
									t('sponsoredItems.confirmVendorPaidConfirm', {
										amount: money(item.payable!),
										vendor: item.vendorBankInfo?.vendorName ?? '',
									}),
								)
							) {
								await act({ kind: 'confirmVendorPaid' })
							}
						}}>
						{t('sponsoredItems.confirmVendorPaid')}
					</AppButton>
				) : (
					<div className='mt-4'>
						<AppNotice>{t('sponsoredItems.vendorWaitingSchool')}</AppNotice>
					</div>
				))}

			{item.status === 'Paid' && activeChannel === 'DIRECT_VENDOR' && item.paidAt && (
				<p className='mt-3 text-sm text-success-app'>
					{t('sponsoredItems.vendorPaidDone', {
						amount: money(item.payable ?? 0),
						date: formatDateTime(item.paidAt),
					})}
				</p>
			)}

			{!active && <p className='mt-3 text-sm text-warning-app'>{t('sponsoredItems.paused')}</p>}
			{error && (
				<p role='alert' className='mt-3 text-sm text-danger-app'>
					{error}
				</p>
			)}
		</article>
	)
}

// Danh sách các mục tài trợ của một ngân sách
export function SponsoredItems({
	budgetId,
	clubId,
	csrfToken,
	fallback = null,
}: {
	budgetId: string
	clubId?: string
	csrfToken: string
	fallback?: ReactNode
}) {
	const { t, i18n } = useTranslation()
	const query = useSponsoredItems(budgetId, clubId)
	if (query.isPending) return <AppSkeleton className='mt-5 h-48' />
	if (query.isError)
		return (
			<p role='alert' className='mt-4 text-danger-app'>
				{t('sponsoredItems.error')}
			</p>
		)
	if (!query.data) return <>{fallback}</>

	const disbursed = query.data.items.reduce((sum, item) => {
		if (item.fundingDecision === 'BEFORE_EVENT') {
			return sum + (item.advanceReceivedAt ? (item.advanceAmount ?? item.approvedAmount) : 0)
		}
		return sum + (item.status === 'Paid' ? (item.payable ?? 0) : 0)
	}, 0)

	const refunded = query.data.items.reduce(
		(sum, item) =>
			sum +
			(item.fundingDecision === 'BEFORE_EVENT' && item.refundConfirmedAt
				? (item.refundAmount ?? 0)
				: 0),
		0,
	)

	const totals = [
		{
			label: t('budgets.approved'),
			amount: query.data.items.reduce((sum, item) => sum + item.approvedAmount, 0),
		},
		{
			label: t('accountability.recorded'),
			amount: query.data.items.reduce((sum, item) => sum + item.amount, 0),
		},
		{ label: t('budgets.transferred'), amount: disbursed },
		...(refunded > 0 ? [{ label: t('budgets.refunded'), amount: refunded }] : []),
	]

	return (
		<section className='mt-6 space-y-4'>
			<h3 className='font-heading text-lg font-semibold'>{t('sponsoredItems.title')}</h3>
			<dl className={cn('grid gap-3', totals.length > 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
				{totals.map((total) => (
					<div key={total.label} className='rounded-xl border border-border-app bg-bg-app p-4'>
						<dt className='text-sm text-muted-app'>{total.label}</dt>
						<dd className='mt-1 text-xl font-semibold tabular-nums'>
							{new Intl.NumberFormat(i18n.language, {
								style: 'currency',
								currency: 'VND',
								maximumFractionDigits: 0,
							}).format(total.amount)}
						</dd>
					</div>
				))}
			</dl>
			{query.data.items.map((item) => (
				<ItemCard
					key={`${item.id}-${item.status}-${item.amount}`}
					budget={query.data!}
					item={item}
					clubId={clubId}
					csrfToken={csrfToken}
				/>
			))}
		</section>
	)
}
