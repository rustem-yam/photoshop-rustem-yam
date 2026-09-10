import { decodeGB7 } from "./gb7"
import { detectDepth } from "./depth"
import { rasterHasAlpha, toImageData } from "./raster"

export function isGB7File(file: File): boolean {
  return file.name.toLowerCase().endsWith(".gb7")
}

// Глубина цвета: из заголовка PNG/JPEG; для прочих форматов — 24 или 32 бита (с альфой)
export async function getImageDepth(file: File, imageData: ImageData): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return detectDepth(bytes) ?? (rasterHasAlpha(imageData) ? 32 : 24)
}

export const loadImage = (file: File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("браузер не смог декодировать изображение"))

    if (typeof file === "string") {
      img.src = file
    } else {
      img.src = URL.createObjectURL(file)
    }
  })
}

// Декодирование файла в пиксели RGBA и определение глубины цвета
export async function decodeImageFile(file: File): Promise<{ imageData: ImageData; depth: number }> {
  if (isGB7File(file)) {
    const { header, raster } = decodeGB7(await file.arrayBuffer())
    return { imageData: toImageData(raster), depth: header.hasMask ? 8 : 7 }
  }

  const img = await loadImage(file)
  try {
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) throw new Error("Не удалось получить контекст canvas")
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const depth = await getImageDepth(file, imageData)
    return { imageData, depth }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}
