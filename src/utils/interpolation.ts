import { createRaster, type Raster } from "./raster"

export type ProgressCallback = (fraction: number) => void
export type ResizeMethod = "nearest" | "bilinear"

// Как часто сообщать о прогрессе (в строках результата)
const PROGRESS_STEP = 64

// Ближайший сосед: для каждого пикселя результата берётся пиксель источника,
// в который попадает его центр
export function nearestNeighborResize(src: Raster, dstW: number, dstH: number, onProgress?: ProgressCallback): Raster {
  const srcW = src.width
  const srcH = src.height
  const srcData = src.data
  const dst = createRaster(dstW, dstH)
  const dstData = dst.data

  const xMap = new Int32Array(dstW)
  for (let i = 0; i < dstW; i++) xMap[i] = Math.min(srcW - 1, Math.floor(((i + 0.5) * srcW) / dstW)) * 4

  for (let j = 0; j < dstH; j++) {
    const sy = Math.min(srcH - 1, Math.floor(((j + 0.5) * srcH) / dstH))
    const rowStart = sy * srcW * 4
    let d = j * dstW * 4
    for (let i = 0; i < dstW; i++, d += 4) {
      const s = rowStart + xMap[i]
      dstData[d] = srcData[s]
      dstData[d + 1] = srcData[s + 1]
      dstData[d + 2] = srcData[s + 2]
      dstData[d + 3] = srcData[s + 3]
    }
    if (onProgress && j % PROGRESS_STEP === 0) onProgress(j / dstH)
  }
  onProgress?.(1)
  return dst
}

// Координаты соседей и веса по одной оси (центры пикселей совмещены)
function axisSamples(srcSize: number, dstSize: number) {
  const i0 = new Int32Array(dstSize)
  const i1 = new Int32Array(dstSize)
  const w = new Float32Array(dstSize)
  const ratio = srcSize / dstSize
  for (let i = 0; i < dstSize; i++) {
    const pos = Math.min(srcSize - 1, Math.max(0, (i + 0.5) * ratio - 0.5))
    const p0 = Math.floor(pos)
    i0[i] = p0
    i1[i] = Math.min(srcSize - 1, p0 + 1)
    w[i] = pos - p0
  }
  return { i0, i1, w }
}

// Билинейная интерполяция: взвешенное среднее 4 соседей.
// Цвет усредняется с учётом альфы (premultiplied), чтобы прозрачные пиксели не давали тёмную кайму
export function bilinearResize(src: Raster, dstW: number, dstH: number, onProgress?: ProgressCallback): Raster {
  const srcW = src.width
  const s = src.data
  const dst = createRaster(dstW, dstH)
  const out = dst.data
  const xs = axisSamples(srcW, dstW)
  const ys = axisSamples(src.height, dstH)

  for (let j = 0; j < dstH; j++) {
    const row0 = ys.i0[j] * srcW
    const row1 = ys.i1[j] * srcW
    const wy = ys.w[j]
    let d = j * dstW * 4

    for (let i = 0; i < dstW; i++, d += 4) {
      const wx = xs.w[i]
      const a = (row0 + xs.i0[i]) * 4
      const b = (row0 + xs.i1[i]) * 4
      const c = (row1 + xs.i0[i]) * 4
      const e = (row1 + xs.i1[i]) * 4

      // веса с учётом альфы соседей
      const wa = (1 - wx) * (1 - wy) * s[a + 3]
      const wb = wx * (1 - wy) * s[b + 3]
      const wc = (1 - wx) * wy * s[c + 3]
      const we = wx * wy * s[e + 3]
      const alpha = wa + wb + wc + we

      if (alpha > 0) {
        out[d] = Math.round((s[a] * wa + s[b] * wb + s[c] * wc + s[e] * we) / alpha)
        out[d + 1] = Math.round((s[a + 1] * wa + s[b + 1] * wb + s[c + 1] * wc + s[e + 1] * we) / alpha)
        out[d + 2] = Math.round((s[a + 2] * wa + s[b + 2] * wb + s[c + 2] * wc + s[e + 2] * we) / alpha)
      }
      out[d + 3] = Math.round(alpha)
    }
    if (onProgress && j % PROGRESS_STEP === 0) onProgress(j / dstH)
  }
  onProgress?.(1)
  return dst
}
