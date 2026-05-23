/** Shrink screenshots before sending to local vision models (major speed win). */

const DEFAULT_MAX_SIDE = 768
const DEFAULT_QUALITY = 0.72

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not encode image'))
    reader.readAsDataURL(blob)
  })
}

export async function compressChatImage(
  file,
  { maxSide = DEFAULT_MAX_SIDE, quality = DEFAULT_QUALITY } = {},
) {
  if (!file?.type?.startsWith('image/')) return null

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  const longest = Math.max(bitmap.width, bitmap.height)
  const scale = longest > maxSide ? maxSide / longest : 1
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    return null
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  if (!blob) return null

  const dataUrl = await blobToDataUrl(blob)
  return {
    dataUrl,
    mime: 'image/jpeg',
    width,
    height,
    size: blob.size,
  }
}
