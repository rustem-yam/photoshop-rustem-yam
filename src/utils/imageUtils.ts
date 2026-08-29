import UPNG from "upng-js"

import { decodeGB7, readGB7Header } from "./gb7"
import { toImageData } from "./raster"

// Парсинг GB7 файла собственным декодером
export async function parseGB7File(file: File) {
  const { header, raster } = decodeGB7(await file.arrayBuffer())
  return { header, imageData: toImageData(raster) }
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
    const header = readGB7Header(await file.slice(0, 12).arrayBuffer())
    return header.hasMask ? 8 : 7 // 8 бит если есть маска, 7 бит если нет
  }

  const arrayBuffer = await file.arrayBuffer()

  if (file.type === "image/png") {
    const png = UPNG.decode(arrayBuffer)
    return png.depth
  }

  // Анализируем реальные данные изображения
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise((res) => (img.onload = res))

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return 24

  ctx.drawImage(img, 0, 0)

  // Анализируем все пиксели для определения реальной глубины цвета
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Анализируем уникальные значения для каждого канала
  const uniqueR = new Set<number>()
  const uniqueG = new Set<number>()
  const uniqueB = new Set<number>()
  const uniqueA = new Set<number>()

  // Проверяем каждый 10-й пиксель для производительности
  const step = Math.max(1, Math.floor(data.length / 40000)) // ~1000 пикселей максимум

  for (let i = 0; i < data.length; i += step * 4) {
    uniqueR.add(data[i]) // R
    uniqueG.add(data[i + 1]) // G
    uniqueB.add(data[i + 2]) // B
    uniqueA.add(data[i + 3]) // A
  }

  // Определяем количество бит на канал на основе уникальных значений
  const getBitsPerChannel = (uniqueValues: Set<number>): number => {
    const count = uniqueValues.size
    if (count <= 2) return 1
    if (count <= 4) return 2
    if (count <= 8) return 3
    if (count <= 16) return 4
    if (count <= 32) return 5
    if (count <= 64) return 6
    if (count <= 128) return 7
    if (count <= 256) return 8
    return 8 // Максимум 8 бит на канал в canvas
  }

  const bitsR = getBitsPerChannel(uniqueR)
  const bitsG = getBitsPerChannel(uniqueG)
  const bitsB = getBitsPerChannel(uniqueB)
  const bitsA = getBitsPerChannel(uniqueA)

  // Определяем, есть ли альфа-канал (прозрачность)
  const hasAlpha = uniqueA.size > 1 && Array.from(uniqueA).some((a) => a < 255)

  // Вычисляем общую глубину цвета
  let totalDepth = bitsR + bitsG + bitsB
  if (hasAlpha) {
    totalDepth += bitsA
  }

  // Очищаем URL объекта
  URL.revokeObjectURL(img.src)

  return totalDepth
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
