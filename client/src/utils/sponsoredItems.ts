import {
  MAX_INVOICE_IMAGE_BYTES,
  MAX_INVOICE_PDF_BYTES,
  type VendorBankInfo,
} from '@/services/sponsoredItems'

export const EMPTY_VENDOR: VendorBankInfo = {
  vendorName: '',
  accountHolder: '',
  accountNumber: '',
  bankName: '',
  bankBranch: '',
  transferNote: '',
}

// Trigger browser file download from a signed URL
export function triggerUrlDownload(url: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Validate attachment MIME type and size (JPG/PNG <= 5 MiB, PDF <= 10 MiB)
export function isAllowedAttachment(file: File): boolean {
  if (file.type === 'application/pdf') {
    return file.size > 0 && file.size <= MAX_INVOICE_PDF_BYTES
  }
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    return file.size > 0 && file.size <= MAX_INVOICE_IMAGE_BYTES
  }
  return false
}

// Compare two vendor bank detail objects after trimming
export function sameVendorInfo(a: VendorBankInfo | undefined, b: VendorBankInfo): boolean {
  return (
    (a?.vendorName ?? '') === b.vendorName.trim() &&
    (a?.accountHolder ?? '') === b.accountHolder.trim() &&
    (a?.accountNumber ?? '') === b.accountNumber.trim() &&
    (a?.bankName ?? '') === b.bankName.trim() &&
    (a?.bankBranch ?? '') === (b.bankBranch?.trim() ?? '') &&
    (a?.transferNote ?? '') === (b.transferNote?.trim() ?? '')
  )
}

// Verify required vendor bank fields are non-empty
export function isVendorInfoComplete(info: VendorBankInfo | undefined): boolean {
  if (!info) {
    return false
  }
  return Boolean(
    info.vendorName.trim() &&
    info.accountHolder.trim() &&
    info.accountNumber.trim() &&
    info.bankName.trim(),
  )
}

// Format a VND amount using the active locale
export function formatSponsoredMoney(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

// Format an ISO timestamp using the active locale
export function formatSponsoredDateTime(value: string, language: string): string {
  return new Date(value).toLocaleString(language)
}
