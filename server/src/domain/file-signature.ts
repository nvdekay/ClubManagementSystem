// Kiểm magic bytes của file tải lên, để loại MIME khai báo không bị giả mạo

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04])

// File Office Open XML (docx/xlsx): một gói zip có [Content_Types].xml
export function isOoxmlZip(bytes: Buffer): boolean {
  return (
    bytes.subarray(0, 4).equals(ZIP_SIGNATURE) && bytes.includes(Buffer.from('[Content_Types].xml'))
  )
}

// Nội dung file khớp magic bytes của loại MIME khai báo (PDF, PNG, JPEG, WebP, DOCX)
export function fileSignatureMatches(mimeType: string, bytes: Buffer): boolean {
  switch (mimeType) {
    case 'application/pdf':
      return bytes.subarray(0, 5).toString('latin1') === '%PDF-'
    case 'image/png':
      return bytes.subarray(0, 8).equals(PNG_SIGNATURE)
    case 'image/jpeg':
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case 'image/webp':
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
        bytes.subarray(8, 12).toString('latin1') === 'WEBP'
      )
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return isOoxmlZip(bytes)
    default:
      return false
  }
}
