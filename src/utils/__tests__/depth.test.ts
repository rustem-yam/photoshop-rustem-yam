import { describe, it, expect } from "vitest"
import { getPngDepth, getJpegDepth, detectDepth } from "../depth"

const png = (bitDepth: number, colorType: number) =>
  new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // сигнатура
    0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, // длина + "IHDR"
    0, 0, 0, 10, 0, 0, 0, 10, // ширина, высота
    bitDepth, colorType, 0, 0, 0, // глубина, тип цвета, сжатие, фильтр, interlace
  ])

const jpeg = (precision: number, components: number, sof = 0xc0) =>
  new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46, // APP0 (сокращённый)
    0xff, 0xdb, 0x00, 0x03, 0x00, // DQT (заглушка)
    0xff, sof, 0x00, 0x0b, precision, 0x00, 0x10, 0x00, 0x10, components, 1, 0x11, 0,
  ])

describe("PNG depth", () => {
  it.each([
    [8, 2, 24],
    [8, 6, 32],
    [8, 0, 8],
    [8, 4, 16],
    [8, 3, 8],
    [16, 2, 48],
    [1, 0, 1],
  ])("bitDepth %i, colorType %i -> %i bit", (bitDepth, colorType, expected) => {
    expect(getPngDepth(png(bitDepth, colorType))).toBe(expected)
  })

  it("returns null for non-png", () => {
    expect(getPngDepth(new Uint8Array(30))).toBeNull()
  })
})

describe("JPEG depth", () => {
  it("color baseline -> 24 bit", () => {
    expect(getJpegDepth(jpeg(8, 3))).toBe(24)
  })

  it("grayscale -> 8 bit", () => {
    expect(getJpegDepth(jpeg(8, 1))).toBe(8)
  })

  it("progressive CMYK -> 32 bit", () => {
    expect(getJpegDepth(jpeg(8, 4, 0xc2))).toBe(32)
  })

  it("detectDepth picks the right parser", () => {
    expect(detectDepth(jpeg(12, 3))).toBe(36)
    expect(detectDepth(png(8, 6))).toBe(32)
    expect(detectDepth(new Uint8Array([1, 2, 3]))).toBeNull()
  })
})
