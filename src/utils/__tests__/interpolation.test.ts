import { describe, it, expect } from "vitest"
import { bilinearResize, nearestNeighborResize } from "../interpolation"

const raster = (pixels: number[][], width: number) => ({
  width,
  height: pixels.length / width,
  data: new Uint8ClampedArray(pixels.flat()),
})
const gray = (v: number) => [v, v, v, 255]
const values = (r: { data: Uint8ClampedArray }) => Array.from(r.data).filter((_, i) => i % 4 === 0)

describe("nearest neighbor", () => {
  it("same size is an exact copy", () => {
    const src = raster([gray(1), gray(2), gray(3), gray(4)], 2)
    expect(Array.from(nearestNeighborResize(src, 2, 2).data)).toEqual(Array.from(src.data))
  })

  it("2x upscale repeats pixels", () => {
    expect(values(nearestNeighborResize(raster([gray(10), gray(200)], 2), 4, 1))).toEqual([10, 10, 200, 200])
  })

  it("downscale takes pixels under destination centers", () => {
    const src = raster([gray(0), gray(1), gray(2), gray(3)], 4)
    expect(values(nearestNeighborResize(src, 2, 1))).toEqual([1, 3])
  })
})

describe("bilinear", () => {
  it("same size is an exact copy", () => {
    const src = raster([gray(5), gray(99), gray(150), gray(7)], 2)
    expect(Array.from(bilinearResize(src, 2, 2).data)).toEqual(Array.from(src.data))
  })

  it("interpolates between pixel centers", () => {
    expect(values(bilinearResize(raster([gray(0), gray(255)], 2), 4, 1))).toEqual([0, 64, 191, 255])
  })

  it("2x downscale averages neighbours", () => {
    expect(values(bilinearResize(raster([gray(0), gray(100), gray(200), gray(250)], 4), 2, 1))).toEqual([50, 225])
  })

  it("does not darken colors next to transparent pixels", () => {
    const out = bilinearResize(raster([[255, 0, 0, 255], [0, 0, 0, 0]], 2), 1, 1)
    expect(Array.from(out.data)).toEqual([255, 0, 0, 128])
  })

  it("reports progress up to 1", () => {
    const calls: number[] = []
    bilinearResize(raster([gray(0), gray(255)], 2), 3, 200, (p) => calls.push(p))
    expect(calls[0]).toBe(0)
    expect(calls[calls.length - 1]).toBe(1)
  })
})
