import { describe, it, expect } from "vitest"
import { compositeLayers, getDocumentSize, type CompositeLayer } from "../compositing"

const layer = (pixels: number[][], width: number, extra: Partial<CompositeLayer> = {}): CompositeLayer => ({
  imageData: { width, height: pixels.length / width, data: new Uint8ClampedArray(pixels.flat()) },
  visible: true,
  opacity: 1,
  blendMode: "normal",
  alpha: null,
  ...extra,
})

const px = (l: CompositeLayer[]) => Array.from(compositeLayers(l).data)

describe("compositeLayers", () => {
  it("single opaque layer is copied as is", () => {
    expect(px([layer([[10, 20, 30, 255]], 1)])).toEqual([10, 20, 30, 255])
  })

  it("applies alpha only once (no squared alpha)", () => {
    expect(px([layer([[200, 100, 50, 128]], 1)])).toEqual([200, 100, 50, 128])
  })

  it("opacity multiplies alpha", () => {
    expect(px([layer([[200, 100, 50, 255]], 1, { opacity: 0.5 })])[3]).toBe(128)
  })

  it("normal over opaque base mixes by alpha", () => {
    const base = layer([[0, 0, 0, 255]], 1)
    const top = layer([[255, 255, 255, 255]], 1, { opacity: 0.5 })
    expect(px([base, top])).toEqual([128, 128, 128, 255])
  })

  it("multiply and screen blend modes", () => {
    const base = layer([[128, 255, 0, 255]], 1)
    expect(px([base, layer([[128, 128, 128, 255]], 1, { blendMode: "multiply" })])).toEqual([64, 128, 0, 255])
    expect(px([base, layer([[128, 0, 255, 255]], 1, { blendMode: "screen" })])).toEqual([192, 255, 255, 255])
  })

  it("hidden layer and hidden alpha channel", () => {
    expect(px([layer([[1, 2, 3, 255]], 1, { visible: false })])).toEqual([0, 0, 0, 0])
    expect(px([layer([[1, 2, 3, 0]], 1, { alpha: { visible: false } })])).toEqual([1, 2, 3, 255])
  })

  it("keeps color under fully transparent pixels of the bottom layer", () => {
    expect(px([layer([[84, 84, 84, 0]], 1)])).toEqual([84, 84, 84, 0])
  })

  it("centers smaller layers in the document", () => {
    const big = layer(Array.from({ length: 9 }, () => [0, 0, 0, 255]), 3)
    const dot = layer([[255, 0, 0, 255]], 1)
    expect(getDocumentSize([big, dot])).toEqual({ width: 3, height: 3 })
    const out = px([big, dot])
    expect(out.slice(16, 20)).toEqual([255, 0, 0, 255]) // центр (1,1)
    expect(out.slice(0, 4)).toEqual([0, 0, 0, 255])
  })
})
