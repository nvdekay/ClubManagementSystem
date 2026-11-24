export const sponsoredItems = {
  vi: {
    title: 'Giải ngân & chứng từ theo hạng mục',
    funding: 'Quyết định tài trợ',
    choose: 'Chọn quyết định cho hạng mục',
    NOT_SPONSORED: 'Không tài trợ',
    BEFORE_EVENT: 'Tài trợ · Trả trước',
    AFTER_EVENT: 'Tài trợ · Trả sau',
    channel_VIA_OFFICER_ADVANCE:
      'Trả trước qua cán bộ ICPDP (chưa cần hóa đơn trước, đối soát sau sự kiện)',
    channel_VIA_OFFICER_REIMBURSE: 'CLB tự chi trước · Nhận hoàn qua cán bộ ICPDP',
    channel_DIRECT_VENDOR: 'Lập hợp đồng NCC · Nhà trường chuyển trực tiếp cho nhà cung cấp',
    channelSelectLabel: 'Hình thức thanh toán sau sự kiện',
    channelSelfPaidOption:
      'CLB tự chi trước (nhà trường chuyển về tài khoản cán bộ ICPDP, cán bộ chuyển lại CLB)',
    channelDirectVendorOption:
      'Lập hợp đồng với nhà cung cấp (nhà trường chuyển trực tiếp cho nhà cung cấp)',
    decisionHintBefore:
      'Trường sẽ chuyển tiền về tài khoản cán bộ ICPDP phụ trách để chuyển cho CLB mà không cần hóa đơn trước; CLB nộp chứng từ đối soát sau sự kiện.',
    decisionHintAfterDirect:
      'Khoản này từ 5.000.000 VNĐ trở lên: CLB bắt buộc lập hợp đồng và gửi thông tin chuyển khoản nhà cung cấp để nhà trường thanh toán trực tiếp.',
    decisionHintAfterFlexible:
      'Khoản dưới 5.000.000 VNĐ: CLB có thể tự chi trước (nhận lại qua cán bộ ICPDP) hoặc lập hợp đồng để nhà trường chuyển trực tiếp nhà cung cấp.',
    cap: 'Trần tài trợ',
    amount: 'Tổng giá trị hóa đơn / hợp đồng',
    description: 'Nội dung khoản chi',
    images: 'Chứng từ (hóa đơn, hợp đồng)',
    officerImages: 'Chứng từ CLB đã tải lên',
    noAttachmentsYet: 'CLB chưa tải lên chứng từ nào.',
    draftHiddenOfficer:
      'CLB đang chuẩn bị chứng từ — thông tin và tệp đính kèm sẽ hiển thị sau khi CLB bấm nộp.',
    notEntered: 'Chưa nhập',
    imageHint:
      'Chọn hoặc kéo thả JPG/PNG (tối đa 5 MB) hoặc PDF (tối đa 10 MB) · Tối đa 5 tệp/hạng mục',
    upload: 'Thêm chứng từ',
    remove: 'Bỏ tệp',
    view: 'Xem tệp',
    download: 'Lưu về máy',
    downloadAll: 'Lưu tất cả chứng từ',
    downloading: 'Đang tải...',
    downloadError: 'Không tải được tệp chứng từ. Vui lòng thử lại.',
    pdfFile: 'Tệp PDF',
    save: 'Lưu nháp',
    submit: 'Nộp bộ chứng từ đầy đủ',
    submitConfirm:
      'Bạn đã tập hợp đủ chứng từ (và thông tin chuyển khoản nhà cung cấp nếu có)? Sau khi nộp, hồ sơ sẽ bị khóa để ICPDP đối soát.',
    review: 'Duyệt đối soát',
    return: 'Yêu cầu sửa trong hạn gốc',
    valid: 'Giá trị chứng từ hợp lệ',
    reason: 'Lý do / nhận xét',
    recordAdvance: 'Xác nhận đã chuyển tiền tạm ứng cho CLB',
    recordAdvanceConfirm:
      'Xác nhận bạn đã nhận {{amount}} từ nhà trường và chuyển tiền tạm ứng cho CLB?',
    advancePendingOfficer:
      'Chờ cán bộ ICPDP nhận tiền từ nhà trường và chuyển tạm ứng cho CLB (chưa cần hóa đơn).',
    advanceSentNotice:
      'Cán bộ ICPDP đã chuyển tạm ứng {{amount}} vào ngày {{date}}. Vui lòng xác nhận khi CLB đã nhận đủ tiền.',
    advanceSentWaitingClub:
      'Đã ghi nhận chuyển tạm ứng {{amount}} vào ngày {{date}}. Đang chờ CLB xác nhận đã nhận tiền.',
    confirmAdvanceReceived: 'Xác nhận CLB đã nhận tiền ứng',
    confirmAdvanceReceivedConfirm:
      'Xác nhận CLB đã nhận đủ {{amount}} từ cán bộ ICPDP? Sau sự kiện CLB vẫn phải nộp đầy đủ chứng từ đối soát.',
    advanceReceivedSummary:
      'Đã giải ngân trước sự kiện: {{amount}} (CLB xác nhận nhận ngày {{date}}). Nộp đầy đủ hóa đơn chứng từ sau khi sự kiện kết thúc.',
    reconciliationValid: 'Giá trị chứng từ hợp lệ',
    reconciliationDelta: 'Chênh lệch so với tạm ứng',
    reconciliationDeltaShort:
      'Chi hợp lệ thấp hơn số tiền đã ứng {{amount}} — CLB cần chuyển khoản hoàn trả số tiền dư này về tài khoản nhà trường.',
    reconciliationDeltaExact: 'Chi hợp lệ khớp đủ số tiền đã tạm ứng.',
    refundRequiredBanner:
      'CLB cần chuyển khoản hoàn trả {{amount}} về tài khoản ngân hàng của nhà trường, sau đó tải biên lai chuyển khoản lên để ICPDP xác nhận.',
    refundStartButton: 'Thực hiện hoàn trả',
    refundHideAccount: 'Ẩn thông tin tài khoản nhà trường',
    refundShowAccountAgain: 'Xem lại tài khoản nhà trường',
    refundAccountTitle: 'Thông tin chuyển khoản hoàn trả về nhà trường',
    refundAccountHint:
      'Vui lòng chuyển đúng số tiền dư vào tài khoản dưới đây và tải biên lai/chứng từ chuyển khoản lên hệ thống.',
    refundAccountLoading: 'Đang tải thông tin tài khoản nhà trường...',
    refundAccountNotConfigured:
      'Nhà trường chưa cấu hình số tài khoản hoàn trả. Vui lòng liên hệ cán bộ ICPDP để được hướng dẫn.',
    refundAmountDue: 'Số tiền cần hoàn trả',
    refundCopyAccount: 'Sao chép STK',
    refundCopied: 'Đã sao chép',
    refundProofsLabel: 'Biên lai / chứng từ chuyển khoản hoàn trả',
    refundProofsOfficerLabel: 'Biên lai hoàn trả CLB đã tải lên',
    refundProofsHint:
      'Chọn hoặc kéo thả ảnh JPG/PNG (tối đa 5 MB) hoặc PDF (tối đa 10 MB) · Tối đa 5 tệp',
    refundProofsUpload: 'Thêm biên lai hoàn trả',
    refundProofsDownloadAll: 'Lưu tất cả biên lai hoàn trả',
    refundNoteLabel: 'Ghi chú / mã giao dịch chuyển khoản (tùy chọn)',
    refundNotePlaceholder: 'Ví dụ: Đã chuyển khoản lúc 14:30, mã GD FT26...',
    submitRefund: 'Gửi xác nhận đã hoàn trả',
    submitRefundConfirm:
      'Xác nhận CLB đã chuyển khoản đủ {{amount}} về tài khoản nhà trường và đính kèm đúng biên lai chuyển khoản?',
    refundWaitingClubOfficer:
      'CLB cần hoàn trả {{amount}} về tài khoản nhà trường. Đang chờ CLB chuyển khoản và gửi biên lai xác nhận.',
    refundSubmittedClubNotice:
      'CLB đã gửi biên lai hoàn trả {{amount}} vào ngày {{date}}. Đang chờ cán bộ ICPDP kiểm tra và xác nhận.',
    refundSubmittedOfficerTitle: 'CLB đã gửi biên lai hoàn trả — chờ ICPDP xác nhận',
    refundClubNote: 'Ghi chú từ CLB',
    refundReviewReasonLabel: 'Nhận xét / lý do (bắt buộc nếu yêu cầu gửi lại biên lai)',
    confirmRefund: 'Xác nhận đã nhận hoàn trả',
    confirmRefundConfirm:
      'Xác nhận nhà trường đã nhận đủ {{amount}} tiền hoàn trả từ CLB? Sau khi xác nhận, hạng mục sẽ hoàn tất đối soát.',
    returnRefund: 'Yêu cầu gửi lại biên lai',
    refundReturnedReason: 'Yêu cầu bổ sung từ ICPDP',
    refundConfirmedDone:
      'ICPDP đã xác nhận nhận đủ {{amount}} tiền hoàn trả về nhà trường ngày {{date}}.',
    pay: 'Xác nhận đã nhận tiền từ cán bộ ICPDP',
    payConfirm:
      'Xác nhận CLB đã nhận đủ {{amount}} từ cán bộ ICPDP cho khoản chi này? Thao tác này không thể hoàn tác.',
    confirmVendorPaid: 'Xác nhận nhà trường đã thanh toán cho nhà cung cấp',
    confirmVendorPaidConfirm:
      'Xác nhận đã chuyển thông tin lên nhà trường và nhà trường đã thanh toán đủ {{amount}} cho nhà cung cấp {{vendor}}? Thao tác này không thể hoàn tác.',
    vendorWaitingSchool:
      'ICPDP đã duyệt thông tin và chứng từ. Đang chờ cán bộ gửi lên nhà trường thanh toán trực tiếp cho nhà cung cấp.',
    vendorPaidDone:
      'Cán bộ ICPDP đã xác nhận nhà trường thanh toán trực tiếp {{amount}} cho nhà cung cấp ngày {{date}}.',
    officerReimburseWaitingClub:
      'Đã duyệt {{amount}}. Sau khi nhà trường chuyển về tài khoản cán bộ ICPDP và cán bộ chuyển lại cho CLB, CLB sẽ bấm xác nhận đã nhận tiền.',
    vendorSectionTitle: 'Thông tin chuyển khoản nhà cung cấp',
    vendorName: 'Tên nhà cung cấp / đơn vị thụ hưởng',
    accountHolder: 'Tên chủ tài khoản',
    accountNumber: 'Số tài khoản',
    bankName: 'Ngân hàng',
    bankBranch: 'Chi nhánh (tùy chọn)',
    transferNote: 'Nội dung chuyển khoản / số hợp đồng (tùy chọn)',
    vendorRequiredError:
      'Vui lòng điền đầy đủ tên nhà cung cấp, chủ tài khoản, số tài khoản và tên ngân hàng.',
    payable: 'Số tiền được duyệt thanh toán',
    acceptedAfterAdvance: 'Số tiền hợp lệ được ghi nhận',
    deadline: 'Hạn nộp chứng từ',
    opens: 'Mở nộp chứng từ từ',
    progress: 'Đã tải {{done}}/{{total}} tệp',
    invalidImages:
      'Chỉ nhận JPG/PNG tối đa 5 MB hoặc PDF tối đa 10 MB; tổng số tệp không vượt quá 5.',
    error: 'Không thực hiện được thao tác. Kiểm tra dữ liệu, thời hạn và thử lại.',
    imageError: 'Không tải được bản xem trước',
    AwaitingAdvance: 'Chờ giải ngân trước',
    AdvanceSent: 'Đã chuyển tiền ứng',
    Draft: 'Nháp',
    Submitted: 'Chờ đối soát',
    Returned: 'Cần sửa',
    Accepted: 'Đã duyệt',
    RefundPending: 'Chờ CLB hoàn trả',
    RefundSubmitted: 'Chờ xác nhận hoàn trả',
    Reconciled: 'Đã đối soát',
    Rejected: 'Không được chấp nhận',
    Expired: 'Hết hạn nộp',
    Paid: 'Đã thanh toán',
    paused: 'Tài chính tạm khóa do trạng thái sự kiện. Hồ sơ và lịch sử được giữ nguyên.',
  },
  en: {
    title: 'Disbursement & item documents',
    funding: 'Funding decision',
    choose: 'Choose a decision for this item',
    NOT_SPONSORED: 'Not sponsored',
    BEFORE_EVENT: 'Sponsored · Before event',
    AFTER_EVENT: 'Sponsored · After event',
    channel_VIA_OFFICER_ADVANCE:
      'Pre-event advance via ICPDP officer (no invoice required upfront; reconcile after event)',
    channel_VIA_OFFICER_REIMBURSE: 'Club self-paid · Reimbursed via ICPDP officer',
    channel_DIRECT_VENDOR: 'Vendor contract · School pays vendor directly',
    channelSelectLabel: 'Post-event disbursement method',
    channelSelfPaidOption:
      'Club pays vendor upfront (school transfers to ICPDP officer, officer forwards to club)',
    channelDirectVendorOption: 'Contract with vendor (school transfers directly to the vendor)',
    decisionHintBefore:
      'School transfers funds to the assigned ICPDP officer to forward to the club without upfront invoices; invoices must still be submitted after the event.',
    decisionHintAfterDirect:
      '5,000,000 VND or more: club must sign a vendor contract and submit vendor bank details for direct school transfer.',
    decisionHintAfterFlexible:
      'Under 5,000,000 VND: club may either pay upfront (reimbursed via ICPDP officer) or contract with the vendor for direct school transfer.',
    cap: 'Funding cap',
    amount: 'Total invoice / contract amount',
    description: 'Expense description',
    images: 'Supporting documents (invoices, contracts)',
    officerImages: 'Documents uploaded by club',
    noAttachmentsYet: 'The club has not uploaded any documents yet.',
    draftHiddenOfficer:
      'The club is preparing this document pack — details and attachments will appear after submission.',
    notEntered: 'Not provided',
    imageHint: 'Choose or drop JPG/PNG (max 5 MB) or PDF (max 10 MB) · Up to 5 files per item',
    upload: 'Add files',
    remove: 'Remove file',
    view: 'Open file',
    download: 'Save file',
    downloadAll: 'Save all files',
    downloading: 'Saving...',
    downloadError: 'Unable to download this attachment. Please try again.',
    pdfFile: 'PDF document',
    save: 'Save draft',
    submit: 'Submit complete document pack',
    submitConfirm:
      'Have you uploaded all documents (and vendor bank details if required)? Submission locks the pack for ICPDP review.',
    review: 'Approve review',
    return: 'Return within original deadline',
    valid: 'Accepted document value',
    reason: 'Reason / review notes',
    recordAdvance: 'Confirm advance sent to club',
    recordAdvanceConfirm:
      'Confirm you received {{amount}} from the school and transferred the advance to the club?',
    advancePendingOfficer:
      'Waiting for the ICPDP officer to receive funds from the school and forward the advance to the club (no invoice needed yet).',
    advanceSentNotice:
      'ICPDP officer sent an advance of {{amount}} on {{date}}. Please confirm once the club receives the funds.',
    advanceSentWaitingClub:
      'Recorded advance transfer of {{amount}} on {{date}}. Waiting for the club to confirm receipt.',
    confirmAdvanceReceived: 'Confirm advance received',
    confirmAdvanceReceivedConfirm:
      'Confirm the club received the full {{amount}} from the ICPDP officer? Full invoices must still be submitted after the event.',
    advanceReceivedSummary:
      'Pre-event advance disbursed: {{amount}} (club confirmed on {{date}}). Submit all invoices after the event ends.',
    reconciliationValid: 'Accepted invoice value',
    reconciliationDelta: 'Variance vs. advance',
    reconciliationDeltaShort:
      'Accepted amount is {{amount}} below the advance — the club must transfer this surplus back to the school bank account.',
    reconciliationDeltaExact: 'Accepted amount fully matches the advance.',
    refundRequiredBanner:
      "The club must transfer {{amount}} back to the school's bank account and upload the transfer receipt for ICPDP verification.",
    refundStartButton: 'Refund surplus',
    refundHideAccount: 'Hide school bank details',
    refundShowAccountAgain: 'Show school bank details',
    refundAccountTitle: 'School bank account for advance refund',
    refundAccountHint:
      'Transfer the exact surplus amount to the bank account below, then upload your transfer receipt(s).',
    refundAccountLoading: 'Loading school bank account details...',
    refundAccountNotConfigured:
      'The school refund bank account has not been configured yet. Please contact an ICPDP officer.',
    refundAmountDue: 'Amount to refund',
    refundCopyAccount: 'Copy account no.',
    refundCopied: 'Copied',
    refundProofsLabel: 'Refund transfer receipts',
    refundProofsOfficerLabel: 'Refund receipts uploaded by club',
    refundProofsHint: 'Choose or drop JPG/PNG (max 5 MB) or PDF (max 10 MB) · Up to 5 files',
    refundProofsUpload: 'Add refund receipt',
    refundProofsDownloadAll: 'Save all refund receipts',
    refundNoteLabel: 'Transfer note / transaction reference (optional)',
    refundNotePlaceholder: 'e.g., Transferred at 14:30, ref FT26...',
    submitRefund: 'Submit refund confirmation',
    submitRefundConfirm:
      'Confirm the club has transferred {{amount}} to the school bank account and attached the transfer receipt(s)?',
    refundWaitingClubOfficer:
      'Club owes a refund of {{amount}} to the school. Waiting for the club to transfer and submit receipts.',
    refundSubmittedClubNotice:
      'Refund receipts for {{amount}} submitted on {{date}}. Waiting for ICPDP officer verification.',
    refundSubmittedOfficerTitle: 'Club submitted refund receipts — awaiting ICPDP confirmation',
    refundClubNote: 'Club note',
    refundReviewReasonLabel: 'Notes / reason (required if returning receipts)',
    confirmRefund: 'Confirm refund received',
    confirmRefundConfirm:
      'Confirm the school has received the full {{amount}} refund from the club? This completes item reconciliation.',
    returnRefund: 'Return refund receipts',
    refundReturnedReason: 'ICPDP return note',
    refundConfirmedDone:
      'ICPDP confirmed receipt of the {{amount}} refund to the school on {{date}}.',
    pay: 'Confirm reimbursement received from ICPDP officer',
    payConfirm:
      'Confirm the club received the full {{amount}} from the ICPDP officer for this item? This cannot be undone.',
    confirmVendorPaid: 'Confirm school paid vendor',
    confirmVendorPaidConfirm:
      'Confirm details were forwarded to the school and the school paid {{amount}} directly to vendor {{vendor}}? This cannot be undone.',
    vendorWaitingSchool:
      'ICPDP approved the contract and bank details. Waiting for ICPDP to confirm direct school payment to the vendor.',
    vendorPaidDone:
      'ICPDP confirmed direct school payment of {{amount}} to the vendor on {{date}}.',
    officerReimburseWaitingClub:
      'Approved {{amount}}. Once the school transfers to the ICPDP officer and the officer forwards to the club, the club confirms receipt.',
    vendorSectionTitle: 'Vendor bank transfer details',
    vendorName: 'Vendor / beneficiary name',
    accountHolder: 'Account holder name',
    accountNumber: 'Account number',
    bankName: 'Bank name',
    bankBranch: 'Branch (optional)',
    transferNote: 'Transfer reference / contract no. (optional)',
    vendorRequiredError:
      'Please fill in vendor name, account holder, account number, and bank name.',
    payable: 'Approved payment amount',
    acceptedAfterAdvance: 'Accepted reconciled amount',
    deadline: 'Document deadline',
    opens: 'Submission opens',
    progress: 'Uploaded {{done}}/{{total}} files',
    invalidImages: 'Only JPG/PNG up to 5 MB or PDF up to 10 MB; no more than 5 files in total.',
    error: 'Unable to complete this action. Check the values and deadline, then try again.',
    imageError: 'Unable to load preview',
    AwaitingAdvance: 'Awaiting advance',
    AdvanceSent: 'Advance sent',
    Draft: 'Draft',
    Submitted: 'Awaiting review',
    Returned: 'Correction needed',
    Accepted: 'Approved',
    RefundPending: 'Awaiting club refund',
    RefundSubmitted: 'Awaiting refund confirmation',
    Reconciled: 'Reconciled',
    Rejected: 'Not accepted',
    Expired: 'Submission expired',
    Paid: 'Paid',
    paused: 'Finance is paused because of the event status. Records and history are preserved.',
  },
}
