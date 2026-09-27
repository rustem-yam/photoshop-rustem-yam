import { describe, it, expect } from "vitest"
import { computeHistogram, histogramHeights } from "../histogram"

const raster = (pixels: number[][], width: number) => ({
  width,
  height: pixels.length / width,
  data: new Uint8ClampedArray(pixels.flat()),
})

describe("histogram", () => {
  it("counts every channel and luma, skipping transparent pixels", () => {
    const h = computeHistogram(
      raster(
        [
          [255, 0, 0, 255],
          [255, 0, 0, 255],
          [10, 10, 10, 0], // прозрачный — не учитывается
          [0, 0, 255, 128],
        ],
        4
      )
    )
    expect(h.total).toBe(3)
    expect(h.r[255]).toBe(2)
    expect(h.r[0]).toBe(1)
    expect(h.b[255]).toBe(1)
    expect(h.luma[76]).toBe(2) // 0.299 * 255
    expect(h.luma[29]).toBe(1) // 0.114 * 255
    expect(h.r[10]).toBe(0)
  })

  it("linear heights are proportional, log heights lift small bins", () => {
    const counts = new Uint32Array(256)
    counts[0] = 1000
    counts[1] = 10
    const lin = histogramHeights(counts, "linear")
    const log = histogramHeights(counts, "log")
    expect(lin[0]).toBe(1)
    expect(lin[1]).toBeCloseTo(0.01)
    expect(log[0]).toBe(1)
    expect(log[1]).toBeCloseTo(Math.log1p(10) / Math.log1p(1000))
    expect(log[1]).toBeGreaterThan(lin[1] * 10)
  })

  it("empty histogram gives zero heights", () => {
    expect(Array.from(histogramHeights(new Uint32Array(256), "log")).every((v) => v === 0)).toBe(true)
  })
})
