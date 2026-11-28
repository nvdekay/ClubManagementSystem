import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

import { SimilarClubHints } from '@/components/custom/SimilarClubHints'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import {
  useApplication,
  useApplicationAction,
  useApplicationConfig,
  useApplicationPreview,
  useDocumentAccess,
} from '@/hooks/useApplications'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/hooks/useConfirm'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import type {
  ApplicationDocument,
  ApplicationDocumentType,
  ApplicationRequestError,
  DraftInput,
  FounderProfile,
  FounderRole,
  FoundingIssue,
  SimilarClubHint,
} from '@/services/applications'
import {
  applicationStateLabel,
  applicationStateTone,
  fileRules,
  inputFrom,
} from '@/pages/student/applicationEditorFormat'
import { ApplicationClubStep } from '@/pages/student/ApplicationClubStep'
import { ApplicationDecisionFeedback } from '@/pages/student/ApplicationDecisionFeedback'
import { ApplicationFileCard } from '@/pages/student/ApplicationFileCard'
import { ApplicationFoundersStep } from '@/pages/student/ApplicationFoundersStep'
import { ApplicationReviewStep } from '@/pages/student/ApplicationReviewStep'
import { ApplicationStepNav } from '@/pages/student/ApplicationStepNav'
import { ApplicationSummary } from '@/pages/student/ApplicationSummary'
import { ApplicationVersionHistory } from '@/pages/student/ApplicationVersionHistory'
import { isEmail, isHttpUrl } from '@/utils/validation'

// Trang nhiều bước soạn đơn thành lập CLB: thông tin, sáng lập viên, tài liệu
export function ApplicationEditorPage() {
  const { t } = useTranslation()
  const askConfirm = useConfirm()
  const navigate = useNavigate()
  const { id } = useParams()
  const [founderEmail, setFounderEmail] = useState('')
  const auth = useAuth()
  const config = useApplicationConfig(Boolean(auth.data))
  const detail = useApplication(id, Boolean(auth.data))
  const action = useApplicationAction()
  const documentAccess = useDocumentAccess()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<DraftInput | null>(null)
  const [notice, setNotice] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null)
  const [submitIssues, setSubmitIssues] = useState<FoundingIssue[] | null>(null)
  const [nameConflict, setNameConflict] = useState(false)
  const [submittedHints, setSubmittedHints] = useState<SimilarClubHint[]>([])
  const [addedFounders, setAddedFounders] = useState<Record<string, FounderProfile>>({})
  const [uploading, setUploading] = useState<ApplicationDocumentType | null>(null)
  const application = detail.data?.application
  const state = application?.state
  const editable = !id || state === 'Draft' || state === 'Revision Requested'
  const canWithdraw =
    state === 'Submitted' || state === 'Under Review' || state === 'Revision Requested'
  // Bản xem trước từ server liệt kê những gì còn chặn việc nộp; chỉ tải ở bước xem lại.
  const preview = useApplicationPreview(id, editable && step === 3 && !action.isPending)
  const latestDecision = detail.data?.decisions.at(-1)
  const me = auth.data?.user
  const currentDraft: DraftInput | null =
    draft ??
    (application
      ? inputFrom(application.draft)
      : me
        ? {
            clubName: '',
            fieldId: '',
            summary: '',
            objectives: '',
            fanpageUrl: '',
            contactEmail: '',
            founders: [{ userId: me.id, role: 'LEADER' }],
          }
        : null)
  const documents = application?.draft.documents ?? []
  const requiredFields = config.data?.requirements.required
  const field = useFieldValidation(
    currentDraft
      ? {
          clubName: currentDraft.clubName.trim() ? null : t('common.fieldRequired'),
          fieldId: currentDraft.fieldId ? null : t('common.chooseRequired'),
          summary:
            requiredFields?.summary && !currentDraft.summary.trim()
              ? t('common.fieldRequired')
              : null,
          objectives:
            requiredFields?.objectives && !currentDraft.objectives.trim()
              ? t('common.fieldRequired')
              : null,
          // Fanpage và email liên hệ chỉ được kiểm tra khi chính sách yêu cầu.
          fanpageUrl: !requiredFields?.fanpageUrl
            ? null
            : !currentDraft.fanpageUrl.trim()
              ? t('common.fieldRequired')
              : isHttpUrl(currentDraft.fanpageUrl)
                ? null
                : t('common.invalidUrl'),
          contactEmail: !requiredFields?.contactEmail
            ? null
            : !currentDraft.contactEmail.trim()
              ? t('common.fieldRequired')
              : isEmail(currentDraft.contactEmail)
                ? null
                : t('common.invalidEmail'),
        }
      : {},
  )
  const steps = [
    t('applications.stepClub'),
    t('applications.stepFounders'),
    t('applications.stepFiles'),
    t('applications.stepReview'),
  ]
  // Bước nào chứa từng phần ICPDP có thể đánh dấu, để yêu cầu chỉnh sửa chỉ ra đúng các bước cần sửa.
  const flaggedSteps =
    state === 'Revision Requested' && latestDecision?.outcome === 'Request revision'
      ? new Set(
          latestDecision.sections.flatMap((section) =>
            section === 'club-information'
              ? [0]
              : section === 'founders'
                ? [1]
                : section === 'documents'
                  ? [2]
                  : [],
          ),
        )
      : new Set<number>()

  // Lấy thông báo lỗi để hiển thị
  function errorText(error: unknown): string {
    return error instanceof Error ? error.message : t('applications.actionError')
  }

  // Cập nhật một trường của đơn nháp
  function change<K extends keyof DraftInput>(key: K, value: DraftInput[K]) {
    setNotice(null)
    setSubmitIssues(null)
    setDraft((current) => ({ ...(current ?? currentDraft!), [key]: value }))
  }

  // Lưu đơn nháp, tạo mới nếu chưa có, trả mã đơn
  /** Lưu các chỉnh sửa cục bộ (tạo bản nháp ở lần lưu đầu); trả về id của hồ sơ. */
  async function persist(): Promise<string | null> {
    if (!currentDraft || !auth.data) {
      return null
    }
    if (id && !draft) {
      return id
    }
    setNotice(null)
    try {
      const result = id
        ? await action.mutateAsync({
            kind: 'save',
            id,
            input: currentDraft,
            draftRevision: application?.draftRevision ?? 0,
            csrfToken: auth.data.csrfToken,
          })
        : await action.mutateAsync({
            kind: 'create',
            input: currentDraft,
            csrfToken: auth.data.csrfToken,
          })
      if (!('draft' in result)) {
        throw new Error(t('applications.actionError'))
      }
      setDraft(null)
      if (!id) {
        navigate(`/workspace/applications/${result.id}`, { replace: true })
      }
      return result.id
    } catch (error) {
      setNotice({ tone: 'danger', text: errorText(error) })
      return null
    }
  }

  // Chuyển sang bước khác, lưu nháp trước khi rời bước
  async function goTo(target: number) {
    // Rời bước 1 sẽ hiện mọi lỗi thông tin CLB; chỉ tên và lĩnh vực mới chặn việc lưu nháp.
    if (editable && step === 0 && target > 0) {
      // Chỉ đánh dấu lỗi của bước 1; trang vẫn có thể đi tiếp nên không được cuộn ngược về các lỗi đó.
      field.touchAll(false)
      if (!currentDraft?.clubName.trim() || !currentDraft.fieldId) {
        return
      }
    }
    if (editable && !(await persist())) {
      return
    }
    setStep(target)
  }

  // Chỉ lưu nháp và báo thành công
  async function saveOnly() {
    if (await persist()) {
      setNotice({ tone: 'success', text: t('applications.success') })
    }
  }

  // Tra thông tin hiển thị của sáng lập viên theo mã người dùng
  function founderProfile(userId: string): FounderProfile | undefined {
    if (me && userId === me.id) {
      return { id: me.id, displayName: me.displayName, email: me.email }
    }
    return addedFounders[userId] ?? detail.data?.founders.find((item) => item.id === userId)
  }

  // Thêm sáng lập viên vừa tra được; người đầu tiên sau chủ nhiệm mặc định là phó chủ nhiệm
  function addFounder(profile: FounderProfile) {
    if (!currentDraft) {
      return
    }
    setAddedFounders((current) => ({ ...current, [profile.id]: profile }))
    const hasVice = currentDraft.founders.some((founder) => founder.role === 'VICE_LEADER')
    change('founders', [
      ...currentDraft.founders,
      { userId: profile.id, role: hasVice ? 'MEMBER' : 'VICE_LEADER' },
    ])
  }

  // Đổi vai trò của sáng lập viên
  /** Chỉ có một chủ nhiệm: chọn người mới thì chủ nhiệm cũ nhận vai trò cũ của người được chọn. */
  function setRole(userId: string, role: FounderRole) {
    if (!currentDraft) {
      return
    }
    const previous =
      currentDraft.founders.find((founder) => founder.userId === userId)?.role ?? 'MEMBER'
    change(
      'founders',
      currentDraft.founders.map((founder) => {
        if (founder.userId === userId) {
          return { ...founder, role }
        }
        if (role === 'LEADER' && founder.role === 'LEADER') {
          return { ...founder, role: previous }
        }
        return founder
      }),
    )
  }

  // Tải tài liệu lên sau khi kiểm tra loại và dung lượng tệp
  async function upload(documentType: ApplicationDocumentType, file: File | undefined) {
    if (!file || !id || !auth.data) {
      return
    }
    const rule = fileRules[documentType]
    if (!rule.types.includes(file.type)) {
      setNotice({ tone: 'danger', text: t('applications.fileWrongType') })
      return
    }
    if (file.size > rule.maxBytes) {
      setNotice({ tone: 'danger', text: t('applications.fileTooLarge', { size: rule.size }) })
      return
    }
    setNotice(null)
    setUploading(documentType)
    try {
      await action.mutateAsync({
        kind: 'upload',
        id,
        documentType,
        file,
        csrfToken: auth.data.csrfToken,
      })
    } catch (error) {
      setNotice({ tone: 'danger', text: errorText(error) })
    } finally {
      setUploading(null)
    }
  }

  // Xóa một tài liệu đã tải lên
  async function remove(documentId: string) {
    if (!id || !auth.data) {
      return
    }
    setNotice(null)
    try {
      await action.mutateAsync({ kind: 'remove', id, documentId, csrfToken: auth.data.csrfToken })
    } catch (error) {
      setNotice({ tone: 'danger', text: errorText(error) })
    }
  }

  // Tải tài liệu đã nộp qua URL có chữ ký
  async function download(documentId: string) {
    if (!id) {
      return
    }
    setNotice(null)
    try {
      const access = await documentAccess.mutateAsync({ id, documentId })
      window.location.assign(access.url)
    } catch (error) {
      setNotice({ tone: 'danger', text: errorText(error) })
    }
  }

  // Xác nhận rồi nộp đơn thành lập CLB
  async function submit() {
    if (!id || !auth.data || !(await askConfirm(t('applications.submitPrompt')))) {
      return
    }
    setNotice(null)
    try {
      const result = await action.mutateAsync({
        kind: 'submit',
        id,
        csrfToken: auth.data.csrfToken,
      })
      if ('activeNameConflict' in result) {
        setNameConflict(result.activeNameConflict)
        setSubmittedHints(result.similarClubs)
      }
      setNotice({ tone: 'success', text: t('applications.submitted') })
    } catch (error) {
      const issues = (error as ApplicationRequestError).details?.issues
      if (issues?.length) {
        setSubmitIssues(issues)
      } else {
        setNotice({ tone: 'danger', text: errorText(error) })
      }
    }
  }

  // Xác nhận rồi rút đơn
  async function withdraw() {
    if (!id || !auth.data || !(await askConfirm(t('applications.withdrawConfirm')))) {
      return
    }
    setNotice(null)
    try {
      await action.mutateAsync({ kind: 'withdraw', id, csrfToken: auth.data.csrfToken })
    } catch (error) {
      setNotice({ tone: 'danger', text: errorText(error) })
    }
  }

  if (auth.isPending || (auth.data && (config.isPending || (id && detail.isPending)))) {
    return (
      <div className="max-w-4xl space-y-4">
        <AppSkeleton className="h-12 w-2/3" />
        <AppSkeleton className="h-72 w-full" />
      </div>
    )
  }
  if (!auth.data) {
    return null
  }
  if (config.isError || !config.data) {
    return (
      <AppNotice tone="danger" className="max-w-3xl">
        <p role="alert">{t('applications.unconfigured')}</p>
      </AppNotice>
    )
  }
  if (id && (detail.isError || !application)) {
    return (
      <AppNotice tone="danger" className="max-w-3xl">
        <p role="alert">{t('applications.notFound')}</p>
      </AppNotice>
    )
  }
  if (!currentDraft) {
    return <AppSkeleton className="h-72 w-full max-w-4xl" />
  }

  const { requirements, maxViceLeaders } = config.data
  const required = requirements.required
  const fieldOptions = config.data.fields.map((field) => ({ value: field.id, label: field.name }))
  // Trường mà ICPDP ẩn sau khi đã lưu vẫn hiển thị (có đánh dấu) cho đến khi sinh viên chọn lại.
  if (
    currentDraft.fieldId &&
    !fieldOptions.some((option) => option.value === currentDraft.fieldId)
  ) {
    fieldOptions.push({
      value: currentDraft.fieldId,
      label: t('applications.fieldHidden', {
        name: application?.draft.field || currentDraft.fieldId,
      }),
    })
  }
  const leaders = currentDraft.founders.filter((founder) => founder.role === 'LEADER').length
  const viceLeaders = currentDraft.founders.filter(
    (founder) => founder.role === 'VICE_LEADER',
  ).length
  const rolesValid = leaders === 1 && viceLeaders >= 1 && viceLeaders <= maxViceLeaders
  const missingFounders = Math.max(
    0,
    requirements.minFoundingMembers - currentDraft.founders.length,
  )
  const issues = submitIssues ?? preview.data?.issues ?? []
  // Tìm tài liệu đã tải lên theo loại
  function uploaded(type: ApplicationDocumentType): ApplicationDocument | undefined {
    return documents.find((item) => item.documentType === type)
  }
  // Tóm tắt nội dung đơn (bước xem lại và bản chỉ xem sau khi nộp)
  function summary(value: DraftInput & { field?: string }) {
    return (
      <ApplicationSummary
        value={value}
        fields={config.data!.fields}
        documents={documents}
        meId={me?.id}
        profileOf={founderProfile}
        onDownload={(documentId) => void download(documentId)}
      />
    )
  }
  // Thẻ tải lên một loại tài liệu ở bước tài liệu
  function fileCard(type: ApplicationDocumentType, title: string, hint: string) {
    return (
      <ApplicationFileCard
        type={type}
        title={title}
        hint={hint}
        required={required[type === 'PROPOSAL' ? 'proposal' : 'logo']}
        current={uploaded(type)}
        editable={editable}
        canUpload={editable && Boolean(id)}
        pending={action.isPending}
        uploading={uploading === type}
        onDownload={(documentId) => void download(documentId)}
        onRemove={(documentId) => void remove(documentId)}
        onUpload={(file) => void upload(type, file)}
      />
    )
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={id ? currentDraft.clubName || t('applications.title') : t('applications.new')}
        description={t('applications.description')}
        back={{ to: '/workspace/applications', label: t('applications.back') }}
        actions={
          state && (
            <AppBadge tone={applicationStateTone(state)}>
              {t('applications.state')}: {applicationStateLabel(t, state)}
            </AppBadge>
          )
        }
      />
      {latestDecision && (state === 'Revision Requested' || state === 'Rejected') && (
        <ApplicationDecisionFeedback
          state={state}
          decision={latestDecision}
          revisionDeadlineAt={application?.revisionDeadlineAt}
        />
      )}

      {notice && (
        <AppNotice
          tone={notice.tone}
          role={notice.tone === 'danger' ? 'alert' : 'status'}
          className="mb-6"
        >
          {notice.text}
        </AppNotice>
      )}
      {nameConflict && (
        <AppNotice tone="warning" role="status" className="mb-6">
          {t('applications.submitWarning')}
        </AppNotice>
      )}
      <SimilarClubHints hints={submittedHints} audience="applicant" className="mb-6" />

      {!editable && application ? (
        <section className="space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
          {summary(application.draft)}
        </section>
      ) : (
        <>
          <ApplicationStepNav
            steps={steps}
            step={step}
            flaggedSteps={flaggedSteps}
            isSaved={Boolean(id)}
            pending={action.isPending}
            onGoTo={(index) => void goTo(index)}
          />

          {step === 0 && (
            <ApplicationClubStep
              currentDraft={currentDraft}
              field={field}
              required={required}
              fieldOptions={fieldOptions}
              change={change}
            />
          )}

          {step === 1 && (
            <ApplicationFoundersStep
              founders={currentDraft.founders}
              minFoundingMembers={requirements.minFoundingMembers}
              maxViceLeaders={maxViceLeaders}
              missingFounders={missingFounders}
              rolesValid={rolesValid}
              meId={me?.id}
              founderEmail={founderEmail}
              onFounderEmailChange={setFounderEmail}
              profileOf={founderProfile}
              onAdd={addFounder}
              onRoleChange={setRole}
              onRemove={(userId) =>
                change(
                  'founders',
                  currentDraft.founders.filter((founder) => founder.userId !== userId),
                )
              }
            />
          )}

          {step === 2 && (
            <section className="space-y-5 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
              {!id && <p className="text-sm text-muted-app">{t('applications.saveFirst')}</p>}
              {fileCard('PROPOSAL', t('applications.proposal'), t('applications.proposalHint'))}
              {fileCard('LOGO', t('applications.logo'), t('applications.logoHint'))}
              <p className="text-sm text-muted-app">{t('applications.otherDocumentsHint')}</p>
            </section>
          )}

          {step === 3 && (
            <ApplicationReviewStep
              preview={preview}
              submitIssues={submitIssues}
              issues={issues}
              minFoundingMembers={requirements.minFoundingMembers}
              onFix={setStep}
            >
              {summary({ ...currentDraft, field: application?.draft.field })}
            </ApplicationReviewStep>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {step > 0 && (
              <AppButton
                type="button"
                variant="secondary"
                disabled={action.isPending}
                onClick={() => void goTo(step - 1)}
              >
                {t('applications.previous')}
              </AppButton>
            )}
            <AppButton
              type="button"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => void saveOnly()}
            >
              {action.isPending ? t('applications.saving') : t('applications.save')}
            </AppButton>
            {step < 3 && (
              <AppButton
                type="button"
                disabled={action.isPending}
                onClick={() => void goTo(step + 1)}
              >
                {t('applications.next')}
              </AppButton>
            )}
            {step === 3 && (
              <AppButton
                type="button"
                disabled={action.isPending || preview.isPending || issues.length > 0}
                onClick={() => void submit()}
              >
                <AppIcon name="send" className="size-4" />
                {t('applications.submit')}
              </AppButton>
            )}
          </div>
        </>
      )}

      {canWithdraw && (
        <div className="mt-8">
          <AppButton
            type="button"
            variant="secondary"
            disabled={action.isPending}
            onClick={() => void withdraw()}
          >
            {t('applications.withdraw')}
          </AppButton>
        </div>
      )}

      {application && <ApplicationVersionHistory versions={detail.data?.versions ?? []} />}
    </div>
  )
}
