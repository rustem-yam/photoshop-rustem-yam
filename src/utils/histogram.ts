import type { Raster } from "./raster"

export interface Histogram {
  r: Uint32Array
  g: Uint32Array
  b: Uint32Array
  luma: Uint32Array // яркость BT.601 — для общего (Master) канала
  total: number // число учтённых пикселей
}

export type HistogramChannel = "luma" | "r" | "g" | "b"
export type HistogramScale = "linear" | "log"

// Гистограмма по 256 уровням; полностью прозрачные пиксели не учитываются
export function computeHistogram(raster: Raster): Histogram {
  const r = new Uint32Array(256)
  const g = new Uint32Array(256)
  const b = new Uint32Array(256)
  const luma = new Uint32Array(256)
  const d = raster.data
  let total = 0

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const R = d[i]
    const G = d[i + 1]
    const B = d[i + 2]
    r[R]++
    g[G]++
    b[B]++
    luma[Math.round(0.299 * R + 0.587 * G + 0.114 * B)]++
    total++
  }

  return { r, g, b, luma, total }
}

// Высоты столбцов 0..1. Логарифмический режим: log(1 + n), чтобы были видны редкие уровни
export function histogramHeights(counts: Uint32Array, scale: HistogramScale): Float32Array {
  const out = new Float32Array(counts.length)
  let max = 0
  for (let i = 0; i < counts.length; i++) max = Math.max(max, counts[i])
  if (max === 0) return out

  const norm = scale === "log" ? Math.log1p(max) : max
  for (let i = 0; i < counts.length; i++) {
    out[i] = (scale === "log" ? Math.log1p(counts[i]) : counts[i]) / norm
  }
  return out
}
