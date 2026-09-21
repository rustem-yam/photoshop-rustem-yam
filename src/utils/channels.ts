import { createRaster, type Raster } from "./raster"

export type ChannelId = "r" | "g" | "b" | "a"

export interface ImageAnalysis {
  isGray: boolean // во всех пикселях R = G = B
  hasAlpha: boolean // есть хотя бы один не полностью непрозрачный пиксель
}

export const CHANNEL_INDEX: Record<ChannelId, number> = { r: 0, g: 1, b: 2, a: 3 }

export function analyzeRaster(raster: Raster): ImageAnalysis {
  const d = raster.data
  let isGray = true
  let hasAlpha = false
  for (let i = 0; i < d.length && (isGray || !hasAlpha); i += 4) {
    if (isGray && (d[i] !== d[i + 1] || d[i] !== d[i + 2])) isGray = false
    if (!hasAlpha && d[i + 3] !== 255) hasAlpha = true
  }
  return { isGray, hasAlpha }
}

// Уменьшенная копия (ближайший сосед) — для миниатюр каналов
export function thumbnail(raster: Raster, maxSize: number): Raster {
  const k = Math.min(1, maxSize / Math.max(raster.width, raster.height))
  const w = Math.max(1, Math.round(raster.width * k))
  const h = Math.max(1, Math.round(raster.height * k))
  const out = createRaster(w, h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(raster.height - 1, Math.floor(((y + 0.5) * raster.height) / h))
    for (let x = 0; x < w; x++) {
      const sx = Math.min(raster.width - 1, Math.floor(((x + 0.5) * raster.width) / w))
      const s = (sy * raster.width + sx) * 4
      const o = (y * w + x) * 4
      out.data[o] = raster.data[s]
      out.data[o + 1] = raster.data[s + 1]
      out.data[o + 2] = raster.data[s + 2]
      out.data[o + 3] = raster.data[s + 3]
    }
  }
  return out
}

// Один канал в виде непрозрачного изображения в оттенках серого
export function channelToGray(raster: Raster, channel: ChannelId): Raster {
  const out = createRaster(raster.width, raster.height)
  const c = CHANNEL_INDEX[channel]
  for (let i = 0; i < raster.data.length; i += 4) {
    const v = raster.data[i + c]
    out.data[i] = v
    out.data[i + 1] = v
    out.data[i + 2] = v
    out.data[i + 3] = 255
  }
  return out
}
