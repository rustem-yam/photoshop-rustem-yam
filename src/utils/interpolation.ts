export function nearestNeighborResize(src: ImageData, dstW: number, dstH: number): ImageData {
  const srcW = src.width
  const srcH = src.height
  const srcData = src.data
  const dst = new ImageData(dstW, dstH)
  const dstData = dst.data

  const xRatio = srcW / dstW
  const yRatio = srcH / dstH

  for (let j = 0; j < dstH; j++) {
    const sy = Math.min(srcH - 1, Math.floor(j * yRatio))
    for (let i = 0; i < dstW; i++) {
      const sx = Math.min(srcW - 1, Math.floor(i * xRatio))
      const srcIdx = (sy * srcW + sx) * 4
      const dstIdx = (j * dstW + i) * 4
      dstData[dstIdx] = srcData[srcIdx]
      dstData[dstIdx + 1] = srcData[srcIdx + 1]
      dstData[dstIdx + 2] = srcData[srcIdx + 2]
      dstData[dstIdx + 3] = srcData[srcIdx + 3]
    }
  }
  return dst
}

export function bilinearResize(src: ImageData, dstW: number, dstH: number): ImageData {
  const srcW = src.width
  const srcH = src.height
  const srcData = src.data
  const dst = new ImageData(dstW, dstH)
  const dstData = dst.data

  const xRatio = (srcW - 1) / (dstW - 1 || 1)
  const yRatio = (srcH - 1) / (dstH - 1 || 1)

  for (let j = 0; j < dstH; j++) {
    const y = j * yRatio
    const y0 = Math.floor(y)
    const y1 = Math.min(srcH - 1, y0 + 1)
    const wy = y - y0

    for (let i = 0; i < dstW; i++) {
      const x = i * xRatio
      const x0 = Math.floor(x)
      const x1 = Math.min(srcW - 1, x0 + 1)
      const wx = x - x0

      const idxA = (y0 * srcW + x0) * 4
      const idxB = (y0 * srcW + x1) * 4
      const idxC = (y1 * srcW + x0) * 4
      const idxD = (y1 * srcW + x1) * 4

      for (let k = 0; k < 4; k++) {
        const A = srcData[idxA + k]
        const B = srcData[idxB + k]
        const C = srcData[idxC + k]
        const D = srcData[idxD + k]

        const top = A * (1 - wx) + B * wx
        const bottom = C * (1 - wx) + D * wx
        const value = top * (1 - wy) + bottom * wy
        dstData[(j * dstW + i) * 4 + k] = Math.round(value)
      }
    }
  }
  return dst
}
