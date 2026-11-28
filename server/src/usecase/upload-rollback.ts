// Ghi DB sau khi đã upload: ghi thất bại (đổi trạng thái, lệch phiên bản) thì xoá file vừa upload
// để không để lại file mồ côi, rồi ném lại lỗi gốc
export async function removeOnFailure<T>(
  storage: { remove(assetId: string): Promise<unknown> },
  assetId: string,
  write: () => Promise<T>,
): Promise<T> {
  try {
    return await write()
  } catch (error) {
    await storage.remove(assetId).catch(() => undefined)
    throw error
  }
}
