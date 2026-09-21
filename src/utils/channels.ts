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

export interface ChannelVisibility {
  r: boolean
  g: boolean
  b: boolean
  a: boolean
}

export const ALL_CHANNELS_VISIBLE: ChannelVisibility = { r: true, g: true, b: true, a: true }

export const isAllVisible = (vis: ChannelVisibility, isGray: boolean) =>
  vis.a && (isGray ? vis.r : vis.r && vis.g && vis.b)

// Изображение для показа с учётом включённых каналов (сами пиксели документа не меняются).
// - выключенный цветовой канал обнуляется;
// - если виден ровно один цветовой канал — он показывается в оттенках серого (как в Photoshop),
//   либо в своём цвете при colorize;
// - если цветовые каналы скрыты, а альфа видна — показывается маска альфа-канала;
// - выключенная альфа делает изображение непрозрачным.
export function applyChannelVisibility(
  raster: Raster,
  vis: ChannelVisibility,
  options: { isGray: boolean; colorize?: boolean }
): Raster {
  const { isGray, colorize = false } = options
  if (isAllVisible(vis, isGray)) return raster

  const color = isGray ? [vis.r] : [vis.r, vis.g, vis.b]
  const shown = color.filter(Boolean).length
  const single = !isGray && shown === 1 && !colorize ? color.indexOf(true) : -1

  const src = raster.data
  const out = createRaster(raster.width, raster.height)
  const dst = out.data

  for (let i = 0; i < src.length; i += 4) {
    const a = vis.a ? src[i + 3] : 255

    if (shown === 0) {
      const v = vis.a ? src[i + 3] : 0
      dst[i] = v
      dst[i + 1] = v
      dst[i + 2] = v
      dst[i + 3] = 255
    } else if (isGray || single >= 0) {
      const v = src[i + (isGray ? 0 : single)]
      dst[i] = v
      dst[i + 1] = v
      dst[i + 2] = v
      dst[i + 3] = a
    } else {
      dst[i] = vis.r ? src[i] : 0
      dst[i + 1] = vis.g ? src[i + 1] : 0
      dst[i + 2] = vis.b ? src[i + 2] : 0
      dst[i + 3] = a
    }
  }

  return out
}

// Подпись видимых каналов для строки состояния, например «R, B + A»
export function describeVisibility(vis: ChannelVisibility, isGray: boolean): string {
  const names = isGray ? (vis.r ? ["Серый"] : []) : (["r", "g", "b"] as const).filter((c) => vis[c]).map((c) => c.toUpperCase())
  const parts = names.length ? names.join(", ") : "—"
  return vis.a ? `${parts} + A` : parts
}
