import { describe, it, expect } from "vitest"
import {
  ALL_CHANNELS_VISIBLE,
  analyzeRaster,
  applyChannelVisibility,
  channelToGray,
  describeVisibility,
  thumbnail,
} from "../channels"

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

describe("channel visibility", () => {
  const px = raster([[10, 20, 30, 128]], 1)
  const show = (vis: Partial<Record<"r" | "g" | "b" | "a", boolean>>, isGray = false, colorize = false) =>
    Array.from(
      applyChannelVisibility(px, { r: true, g: true, b: true, a: true, ...vis }, { isGray, colorize }).data
    )

  it("returns the same raster when everything is visible", () => {
    expect(applyChannelVisibility(px, ALL_CHANNELS_VISIBLE, { isGray: false })).toBe(px)
  })

  it("zeroes a hidden channel", () => {
    expect(show({ g: false })).toEqual([10, 0, 30, 128])
  })

  it("shows a single channel as gray, or in color with colorize", () => {
    expect(show({ r: false, b: false })).toEqual([20, 20, 20, 128])
    expect(show({ r: false, b: false }, false, true)).toEqual([0, 20, 0, 128])
  })

  it("hidden alpha makes pixels opaque", () => {
    expect(show({ a: false })).toEqual([10, 20, 30, 255])
  })

  it("only alpha visible shows the mask", () => {
    expect(show({ r: false, g: false, b: false })).toEqual([128, 128, 128, 255])
  })

  it("grayscale image uses one gray channel", () => {
    const gray = raster([[50, 50, 50, 255]], 1)
    const hide = (vis: { r: boolean; a: boolean }) =>
      Array.from(applyChannelVisibility(gray, { g: true, b: true, ...vis }, { isGray: true }).data)
    expect(hide({ r: false, a: true })).toEqual([255, 255, 255, 255]) // видна только маска альфы
    expect(hide({ r: false, a: false })).toEqual([0, 0, 0, 255]) // всё скрыто
    expect(hide({ r: true, a: false })).toEqual([50, 50, 50, 255])
    expect(describeVisibility({ r: true, g: false, b: false, a: false }, true)).toBe("Серый")
    expect(describeVisibility({ r: true, g: false, b: true, a: true }, false)).toBe("R, B + A")
  })
})
