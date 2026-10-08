import { describe, it, expect } from "vitest"
import { applyFilter, matchPreset, presetOptions, type EdgeMode, type FilterPresetId } from "../filters"

const ALL = { r: true, g: true, b: true, a: false }

// Серое изображение из матрицы яркостей
const grayImage = (rows: number[][]) => ({
  width: rows[0].length,
  height: rows.length,
  data: new Uint8ClampedArray(rows.flat().flatMap((v) => [v, v, v, 255])),
})
const grayOf = (r: { width: number; data: Uint8ClampedArray }) => {
  const values = Array.from(r.data).filter((_, i) => i % 4 === 0)
  const out: number[][] = []
  for (let i = 0; i < values.length; i += r.width) out.push(values.slice(i, i + r.width))
  return out
}
const run = (id: FilterPresetId, rows: number[][], edge: EdgeMode = "extend") =>
  grayOf(applyFilter(grayImage(rows), presetOptions(id, ALL, edge)))

const flat = [
  [10, 10, 10],
  [10, 10, 10],
  [10, 10, 10],
]

describe("convolution presets", () => {
  it("identity keeps the image", () => {
    const img = [
      [1, 2, 3],
      [4, 5, 6],
    ]
    expect(run("identity", img)).toEqual(img)
  })

  it("box blur averages 9 pixels", () => {
    expect(run("box", [[0, 0, 0], [0, 90, 0], [0, 0, 0]], "zero")[1][1]).toBe(10)
  })

  it("gaussian gives the center weight 4/16", () => {
    expect(run("gaussian", [[0, 0, 0], [0, 160, 0], [0, 0, 0]], "zero")[1][1]).toBe(40)
  })

  it("sharpen keeps flat areas and boosts details", () => {
    expect(run("sharpen", flat)).toEqual(flat)
    expect(run("sharpen", [[10, 10, 10], [10, 50, 10], [10, 10, 10]])[1][1]).toBe(210)
  })

  it("Prewitt X finds vertical edges, Prewitt Y horizontal", () => {
    const vertical = [
      [0, 0, 100],
      [0, 0, 100],
      [0, 0, 100],
    ]
    expect(run("prewittX", vertical)[1][1]).toBe(255) // 3·100, ограничено 255
    expect(run("prewittY", vertical)[1][1]).toBe(0)
    const horizontal = [
      [0, 0, 0],
      [0, 0, 0],
      [50, 50, 50],
    ]
    expect(run("prewittY", horizontal)[1][1]).toBe(150)
    expect(run("prewittX", horizontal)[1][1]).toBe(0)
  })

  it("median removes impulse noise", () => {
    expect(run("median", [[10, 10, 10], [10, 255, 10], [10, 10, 10]])[1][1]).toBe(10)
  })
})

describe("edge modes", () => {
  const row = [[0, 90, 180]]
  it.each([
    ["extend", 30],
    ["zero", 10],
    ["wrap", 90],
    ["mirror", 60],
  ] as [EdgeMode, number][])("%s: left pixel after box blur = %i", (edge, expected) => {
    expect(run("box", row, edge)[0][0]).toBe(expected)
  })

  it("skip leaves border pixels untouched", () => {
    const img = [
      [90, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]
    const out = run("box", img, "skip")
    expect(out[0][0]).toBe(90)
    expect(out[1][1]).toBe(10)
  })
})

describe("channels and parameters", () => {
  it("processes only selected channels", () => {
    const img = { width: 3, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 90, 90, 90, 255, 0, 0, 0, 255]) }
    const out = applyFilter(img, presetOptions("box", { r: true, g: false, b: false, a: false }, "zero"))
    // одна строка, за краем нули: (0 + 90 + 0) / 9 = 10; G и B не тронуты
    expect(Array.from(out.data.slice(4, 8))).toEqual([10, 90, 90, 255])
  })

  it("alpha channel is filtered only when selected", () => {
    const img = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]) }
    const withA = applyFilter(img, presetOptions("box", { r: false, g: false, b: false, a: true }, "extend"))
    expect(withA.data[3]).toBe(85) // 3 строки × (0 + 0 + 255) / 9
    const withoutA = applyFilter(img, presetOptions("box", ALL, "extend"))
    expect(withoutA.data[3]).toBe(0)
  })

  it("custom kernel with divisor, offset and absolute value", () => {
    const opts = { ...presetOptions("identity", ALL, "extend"), kernel: [0, 0, 0, 0, -2, 0, 0, 0, 0], divisor: 4 }
    expect(grayOf(applyFilter(grayImage([[100]]), opts))[0][0]).toBe(0) // −50 → 0
    expect(grayOf(applyFilter(grayImage([[100]]), { ...opts, absolute: true }))[0][0]).toBe(50)
    expect(grayOf(applyFilter(grayImage([[100]]), { ...opts, offset: 128 }))[0][0]).toBe(78)
  })

  it("recognizes presets from parameters", () => {
    expect(matchPreset(presetOptions("gaussian", ALL, "extend"))).toBe("gaussian")
    expect(matchPreset({ ...presetOptions("box", ALL, "extend"), divisor: 8 })).toBeNull()
  })
})
