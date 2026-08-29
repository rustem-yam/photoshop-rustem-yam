import { describe, it, expect } from "vitest"
import { decodeGB7, readGB7Header } from "../gb7"

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
