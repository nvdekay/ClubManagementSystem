// Lưu blob đã tải về thành file qua trình duyệt
/** Đưa blob đã tải cho trình duyệt để lưu thành file. */
export function saveFile(file: { blob: Blob; fileName: string }): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
