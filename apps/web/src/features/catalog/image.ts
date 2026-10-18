/** Уменьшает картинку до maxSide px по большей стороне и перекодирует в JPEG (экономия места в бесплатном хранилище) */
export async function resizeImage(file: File, maxSide = 512): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Это не изображение')
  if (file.size > 15 * 1024 * 1024) throw new Error('Файл слишком большой (максимум 15 МБ)')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Не удалось прочитать изображение (попробуйте JPG или PNG)')
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать изображение')
  ctx.fillStyle = '#ffffff' // у JPEG нет прозрачности
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось обработать изображение'))),
      'image/jpeg',
      0.85,
    )
  })
}
