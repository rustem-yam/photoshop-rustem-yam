import { describe, it, expect } from "vitest"
import { decodeGB7, encodeGB7, readGB7Header, toGray } from "../gb7"

const header = (width: number, height: number, flags = 0) => [
  0x47,
  0x42,
  0x37,
  0x1d,
  0x01,
  flags,
  width >> 8,
  width & 0xff,
  height >> 8,
  height & 0xff,
  0,
  0,
]

describe("GB7 decoder", () => {
  it("reads header fields (big-endian size, mask flag)", () => {
    const h = readGB7Header(new Uint8Array(header(300, 2, 1)))
    expect(h.width).toBe(300)
    expect(h.height).toBe(2)
    expect(h.hasMask).toBe(true)
    expect(h.version).toBe(1)
  })

  it("rejects wrong signature", () => {
    const bytes = new Uint8Array([...header(1, 1), 0])
    bytes[0] = 0x00
    expect(() => decodeGB7(bytes)).toThrow(/сигнатур/)
  })

  it("rejects truncated pixel data", () => {
    const bytes = new Uint8Array([...header(2, 2), 0, 0, 0])
    expect(() => decodeGB7(bytes)).toThrow(/не хватает/)
  })

  it("decodes 7-bit gray without mask as opaque", () => {
    const bytes = new Uint8Array([...header(3, 1), 0, 127, 0x80 | 64])
    const { raster } = decodeGB7(bytes)
    expect(Array.from(raster.data)).toEqual([0, 0, 0, 255, 255, 255, 255, 255, 129, 129, 129, 255])
  })

  it("applies mask bit when mask flag is set", () => {
    const bytes = new Uint8Array([...header(2, 1, 1), 0x80 | 127, 0x00 | 127])
    const { raster } = decodeGB7(bytes)
    expect(raster.data[3]).toBe(255)
    expect(raster.data[7]).toBe(0)
    // яркость под маской сохраняется
    expect(raster.data[4]).toBe(255)
  })
})

describe("GB7 encoder", () => {
  const raster = (pixels: number[][], width: number) => ({
    width,
    height: pixels.length / width,
    data: new Uint8ClampedArray(pixels.flat()),
  })

  it("writes header: signature, version, big-endian size, no mask for opaque image", () => {
    const bytes = encodeGB7(raster([[0, 0, 0, 255], [255, 255, 255, 255]], 2))
    expect(Array.from(bytes.slice(0, 12))).toEqual([0x47, 0x42, 0x37, 0x1d, 1, 0, 0, 2, 0, 1, 0, 0])
    expect(Array.from(bytes.slice(12))).toEqual([0, 127])
  })

  it("sets mask flag and visibility bit when image has transparency", () => {
    const bytes = encodeGB7(raster([[255, 255, 255, 255], [255, 255, 255, 0], [255, 255, 255, 127]], 3))
    expect(bytes[5]).toBe(1)
    expect(Array.from(bytes.slice(12))).toEqual([0x80 | 127, 127, 127])
  })

  it("converts color to gray with BT.601 weights", () => {
    expect(toGray(255, 0, 0)).toBe(76)
    expect(toGray(0, 255, 0)).toBe(150)
    expect(toGray(0, 0, 255)).toBe(29)
    expect(toGray(42, 42, 42)).toBe(42)
  })

  it("round-trips every 7-bit gray level exactly", () => {
    const src = new Uint8Array([0x47, 0x42, 0x37, 0x1d, 1, 1, 0, 128, 0, 2, 0, 0])
    const pixels = new Uint8Array(256)
    for (let i = 0; i < 256; i++) pixels[i] = i // все значения яркости, с маской и без
    const original = new Uint8Array([...src, ...pixels])
    const { raster: decoded } = decodeGB7(original)
    expect(Array.from(encodeGB7(decoded))).toEqual(Array.from(original))
  })

  it("rejects too large images", () => {
    expect(() => encodeGB7({ width: 70000, height: 1, data: new Uint8ClampedArray(70000 * 4) })).toThrow()
  })
})
