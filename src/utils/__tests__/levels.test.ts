import { describe, it, expect } from "vitest"
import {
  applyLevels,
  buildChannelLut,
  defaultLevels,
  gammaToMidpoint,
  isIdentityLevels,
  midpointToGamma,
} from "../levels"

describe("levels", () => {
  it("default levels are identity", () => {
    const lut = buildChannelLut({ black: 0, white: 255, gamma: 1 })
    expect(Array.from(lut)).toEqual(Array.from({ length: 256 }, (_, i) => i))
    expect(isIdentityLevels(defaultLevels())).toBe(true)
  })

  it("black and white points stretch the range", () => {
    const lut = buildChannelLut({ black: 50, white: 200, gamma: 1 })
    expect(lut[0]).toBe(0)
    expect(lut[50]).toBe(0)
    expect(lut[125]).toBe(128)
    expect(lut[200]).toBe(255)
    expect(lut[255]).toBe(255)
  })

  it("gamma > 1 brightens midtones, < 1 darkens", () => {
    expect(buildChannelLut({ black: 0, white: 255, gamma: 2 })[64]).toBe(128) // sqrt(64/255)·255
    expect(buildChannelLut({ black: 0, white: 255, gamma: 0.5 })[128]).toBe(64)
  })

  it("master is applied after the channel, alpha is kept", () => {
    const params = defaultLevels()
    params.r = { black: 0, white: 128, gamma: 1 } // R: 64 -> 128
    params.master = { black: 0, white: 255, gamma: 0.5 } // 128 -> 64
    const out = applyLevels({ width: 1, height: 1, data: new Uint8ClampedArray([64, 64, 64, 77]) }, params)
    expect(Array.from(out.data)).toEqual([64, 16, 16, 77])
  })

  it("midpoint and gamma are inverse", () => {
    expect(gammaToMidpoint(0, 255, 1)).toBeCloseTo(127.5)
    expect(midpointToGamma(0, 255, 127.5)).toBeCloseTo(1)
    expect(midpointToGamma(10, 210, gammaToMidpoint(10, 210, 2.2))).toBeCloseTo(2.2)
    expect(midpointToGamma(0, 255, 0)).toBe(9.99)
  })
})
