import { describe, it, expect } from "vitest"
import { clampScale, fitScale, stepScale, MIN_SCALE, MAX_SCALE } from "../zoom"

describe("zoom", () => {
  it("clamps view scale to 12..300%", () => {
    expect(MIN_SCALE).toBe(12)
    expect(MAX_SCALE).toBe(300)
    expect(clampScale(5)).toBe(12)
    expect(clampScale(1000)).toBe(300)
    expect(clampScale(55.4)).toBe(55)
  })

  it("steps between presets", () => {
    expect(stepScale(100, 1)).toBe(150)
    expect(stepScale(100, -1)).toBe(67)
    expect(stepScale(12, -1)).toBe(12)
    expect(stepScale(300, 1)).toBe(300)
    expect(stepScale(80, 1)).toBe(100)
  })

  it("fits large images, keeps small ones at 100%", () => {
    expect(fitScale({ width: 4000, height: 2000 }, { width: 1000, height: 800 })).toBe(25)
    expect(fitScale({ width: 200, height: 100 }, { width: 1000, height: 800 })).toBe(100)
    expect(fitScale({ width: 100000, height: 100 }, { width: 1000, height: 800 })).toBe(12)
  })
})
