import { describe, it, expect } from "vitest"
import { analyzeRaster, channelToGray, thumbnail } from "../channels"

const raster = (pixels: number[][], width: number) => ({
  width,
  height: pixels.length / width,
  data: new Uint8ClampedArray(pixels.flat()),
})

describe("channels", () => {
  it("detects grayscale and transparency", () => {
    expect(analyzeRaster(raster([[10, 10, 10, 255], [200, 200, 200, 255]], 2))).toEqual({ isGray: true, hasAlpha: false })
    expect(analyzeRaster(raster([[10, 10, 10, 255], [200, 201, 200, 128]], 2))).toEqual({ isGray: false, hasAlpha: true })
  })

  it("extracts a channel as opaque gray", () => {
    const out = channelToGray(raster([[10, 20, 30, 40]], 1), "g")
    expect(Array.from(out.data)).toEqual([20, 20, 20, 255])
    const alpha = channelToGray(raster([[10, 20, 30, 40]], 1), "a")
    expect(Array.from(alpha.data)).toEqual([40, 40, 40, 255])
  })

  it("thumbnail keeps aspect ratio and fits max size", () => {
    const big = { width: 400, height: 100, data: new Uint8ClampedArray(400 * 100 * 4) }
    const t = thumbnail(big, 96)
    expect([t.width, t.height]).toEqual([96, 24])
    const small = thumbnail(raster([[1, 2, 3, 4]], 1), 96)
    expect([small.width, small.height]).toEqual([1, 1])
  })
})
