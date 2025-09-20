import UPNG from "upng-js"

interface GB7Header {
  signature: string
  version: number
  flags: number
  width: number
  height: number
  reserved: number
  hasMask: boolean
}

// Парсинг GB7 файла: чтение заголовка и пиксельных данных
export async function parseGB7File(file: File): Promise<{ imageData: ImageData; header: GB7Header }> {
  const arrayBuffer = await file.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  const signature = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3)
  )

  if (signature !== "GB7\u001D") {
    throw new Error("Неверная сигнатура .gb7 файла")
  }

  const version = dataView.getUint8(4)
  const flags = dataView.getUint8(5)
  const width = dataView.getUint16(6, false) // big-endian
  const height = dataView.getUint16(8, false) // big-endian
  const reserved = dataView.getUint16(10, false)

  const hasMask = (flags & 0x01) !== 0

  const header: GB7Header = {
    signature,
    version,
    flags,
    width,
    height,
    reserved,
    hasMask,
  }

  const imageData = new Uint8ClampedArray(width * height * 4) // RGBA
  const pixelData = new Uint8Array(arrayBuffer, 12) // Данные начинаются с 12-го байта

  for (let i = 0; i < width * height; i++) {
    const pixelByte = pixelData[i]
    const grayValue = Math.round(((pixelByte & 0x7f) * 255) / 127)
    const isMasked = hasMask ? (pixelByte & 0x80) === 0 : false

    const pixelIndex = i * 4
    if (isMasked) {
      imageData[pixelIndex] = 0 // R
      imageData[pixelIndex + 1] = 0 // G
      imageData[pixelIndex + 2] = 0 // B
      imageData[pixelIndex + 3] = 0 // A (прозрачный)
    } else {
      imageData[pixelIndex] = grayValue // R
      imageData[pixelIndex + 1] = grayValue // G
      imageData[pixelIndex + 2] = grayValue // B
      imageData[pixelIndex + 3] = 255 // A (непрозрачный)
    }
  }

  return {
    imageData: new ImageData(imageData, width, height),
    header,
  }
}

// Конвертация GB7 файла в DataURL для отображения
export async function convertGB7ToDataURL(file: File): Promise<string> {
  const { imageData, header } = await parseGB7File(file)

  const canvas = document.createElement("canvas")
  canvas.width = header.width
  canvas.height = header.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Не удалось получить контекст canvas")
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

export function isGB7File(file: File): boolean {
  return file.name.toLowerCase().endsWith(".gb7")
}

export async function getImageDepth(file: File): Promise<number> {
  if (isGB7File(file)) {
    const { header } = await parseGB7File(file)
    return header.hasMask ? 8 : 7 // 8 бит если есть маска, 7 бит если нет
  }

  const arrayBuffer = await file.arrayBuffer()

  if (file.type === "image/png") {
    const png = UPNG.decode(arrayBuffer)
    return png.depth
  }

  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise((res) => (img.onload = res))

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return 24

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, 1, 1)
  return imageData.data.length * 8
}

export const isTransparentFile = (fileName: string): boolean => {
  const ext = fileName.split(".").pop()?.toLowerCase()
  return ext === "png" || ext === "gb7"
}

export const loadImage = (file: File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject

    if (typeof file === "string") {
      img.src = file
    } else {
      img.src = URL.createObjectURL(file)
    }
  })
}
