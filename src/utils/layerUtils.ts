import type { Layer } from "../types/layers"
import { decodeImageFile } from "./imageUtils"
import { rasterHasAlpha } from "./raster"

let layerCounter = 0
// Date.now() может совпасть у двух слоёв, созданных в одну миллисекунду
export const newLayerId = () => `layer_${Date.now()}_${++layerCounter}`

// Рисует изображение в квадрат size×size с сохранением пропорций
const drawFitted = (ctx: CanvasRenderingContext2D, source: CanvasImageSource, w: number, h: number, size: number) => {
  const k = Math.min(size / w, size / h)
  const dw = Math.max(1, Math.round(w * k))
  const dh = Math.max(1, Math.round(h * k))
  ctx.drawImage(source, 0, 0, w, h, Math.round((size - dw) / 2), Math.round((size - dh) / 2), dw, dh)
}

const imageDataToCanvas = (imageData: ImageData): HTMLCanvasElement | null => {
  const canvas = document.createElement("canvas")
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

const renderPreview = (imageData: ImageData, size: number): string => {
  const source = imageDataToCanvas(imageData)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx || !source) return ""
  drawFitted(ctx, source, source.width, source.height, size)
  return canvas.toDataURL()
}

// Превью слоя; если альфа-канал скрыт — без прозрачности
export const createLayerPreview = (layer: Layer, size: number = 64): string => {
  if (layer.alpha && !layer.alpha.visible) {
    const opaque = new ImageData(new Uint8ClampedArray(layer.imageData.data), layer.imageData.width)
    for (let i = 3; i < opaque.data.length; i += 4) opaque.data[i] = 255
    return renderPreview(opaque, size)
  }
  return renderPreview(layer.imageData, size)
}

// Превью альфа-канала: значение A в оттенках серого
export const createAlphaPreview = (imageData: ImageData, size: number = 64): string => {
  const gray = new ImageData(imageData.width, imageData.height)
  for (let i = 0; i < gray.data.length; i += 4) {
    const a = imageData.data[i + 3]
    gray.data[i] = a
    gray.data[i + 1] = a
    gray.data[i + 2] = a
    gray.data[i + 3] = 255
  }
  return renderPreview(gray, size)
}

// Слой с новыми пикселями: пересчитывает превью и наличие альфа-канала
export const withLayerImage = (layer: Layer, imageData: ImageData): Layer => {
  const hasAlpha = rasterHasAlpha(imageData)
  const updated: Layer = {
    ...layer,
    imageData,
    alpha: hasAlpha
      ? { preview: createAlphaPreview(imageData), visible: layer.alpha ? layer.alpha.visible : true }
      : null,
  }
  updated.preview = createLayerPreview(updated)
  return updated
}

export const createLayerFromImageData = (imageData: ImageData, name: string): Layer =>
  withLayerImage(
    {
      id: newLayerId(),
      name,
      imageData,
      color: null,
      opacity: 1,
      visible: true,
      blendMode: "normal",
      preview: "",
      alpha: null,
    },
    imageData
  )

// Создание слоя из файла (PNG, JPG, GB7 и др.)
export const createLayerFromImage = async (file: File, name: string): Promise<Layer> => {
  const { imageData } = await decodeImageFile(file)
  return createLayerFromImageData(imageData, name)
}

// Создание слоя, залитого цветом
export const createLayerFromColor = (color: string, name: string, width: number, height: number): Layer => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  if (!ctx) throw new Error("Не удалось получить контекст canvas")

  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  const layer = createLayerFromImageData(ctx.getImageData(0, 0, width, height), name)
  return { ...layer, color }
}
