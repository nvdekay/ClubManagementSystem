// Lưu blob đã tải về thành file qua trình duyệt
/** Đưa blob đã tải cho trình duyệt để lưu thành file. */
export function saveFile(file: { blob: Blob; fileName: string }): void {
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName
  link.click()
  URL.revokeObjectURL(url)
}

// Tạo tên tệp an toàn cho ảnh minh chứng từ tiêu đề
function safeImageName(title: string, url: string): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'evidence-image'
  const match = url.match(/^data:image\/([a-z0-9.+-]+);base64,/i)
  const rawExt = match?.[1]?.toLowerCase() ?? 'png'
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt
  return `${base}.${ext}`
}

// Tải ảnh (data URL hoặc URL thường) về máy; lỗi tải thì mở ảnh ở tab mới
export async function saveImageUrl(url: string, title: string) {
  const filename = safeImageName(title, url)
  if (url.startsWith('data:image/')) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    return
  }
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
