import { describe, it, expect } from "vitest"
import {
  normalizeRGB,
  denormalizeRGB,
  rgbToXyz,
  xyzToRgb,
  xyzToLab,
  labToXyz,
  labToLch,
  lchToLab,
  getRelativeLuminance,
  calculateWCAGContrast,
  calculateAPCAContrast,
  rgbToHex,
} from "../colorUtils"

function expectCloseTo(actual: number, expected: number, precision: number = 2) {
  expect(Math.abs(actual - expected)).toBeLessThan(Math.pow(10, -precision))
}

describe("Color Utils", () => {
  describe("normalizeRGB", () => {
    it("should normalize RGB values correctly", () => {
      const result = normalizeRGB(255, 128, 0)
      expectCloseTo(result.r, 1.0, 2)
      expectCloseTo(result.g, 0.502, 2)
      expectCloseTo(result.b, 0.0, 2)
    })
  })

  describe("denormalizeRGB", () => {
    it("should denormalize RGB values correctly", () => {
      const result = denormalizeRGB(1.0, 0.5, 0.0)
      expect(result.r).toBe(255)
      expect(result.g).toBe(128)
      expect(result.b).toBe(0)
    })
  })

  describe("rgbToXyz", () => {
    it("should convert RGB to XYZ correctly", () => {
      const result = rgbToXyz(255, 0, 0) // Pure red
      expectCloseTo(result.x, 0.4124, 3)
      expectCloseTo(result.y, 0.2126, 3)
      expectCloseTo(result.z, 0.0193, 3)
    })

    it("should convert white RGB to XYZ correctly", () => {
      const result = rgbToXyz(255, 255, 255) // White
      expectCloseTo(result.x, 0.9505, 3)
      expectCloseTo(result.y, 1.0, 3)
      expectCloseTo(result.z, 1.0888, 3)
    })
  })

  describe("xyzToRgb", () => {
    it("should convert XYZ to RGB correctly", () => {
      const result = xyzToRgb(0.4124, 0.2126, 0.0193)
      expectCloseTo(result.r, 255, 0)
      expectCloseTo(result.g, 0, 0)
      expectCloseTo(result.b, 0, 0)
    })
  })

  describe("xyzToLab", () => {
    it("should convert XYZ to Lab correctly", () => {
      const result = xyzToLab(0.4124, 0.2126, 0.0193) // Pure red
      expectCloseTo(result.l, 53.24, 1)
      expectCloseTo(result.a, 80.09, 1)
      expectCloseTo(result.b, 67.2, 1)
    })

    it("should convert white XYZ to Lab correctly", () => {
      const result = xyzToLab(0.9505, 1.0, 1.0888) // White
      expectCloseTo(result.l, 100.0, 1)
      expectCloseTo(result.a, 0.0, 1)
      expectCloseTo(result.b, 0.0, 1)
    })
  })

  describe("xyzToLab for dark colors", () => {
    it("black is L=0, not negative", () => {
      const result = xyzToLab(0, 0, 0)
      expectCloseTo(result.l, 0, 3)
      expectCloseTo(result.a, 0, 3)
      expectCloseTo(result.b, 0, 3)
    })

    it("very dark gray uses linear segment", () => {
      // RGB(5,5,5): Y ~ 0.001518 -> L ~ 1.371
      const xyz = rgbToXyz(5, 5, 5)
      const result = xyzToLab(xyz.x, xyz.y, xyz.z)
      expectCloseTo(result.l, 1.371, 2)
    })

    it("is continuous at the threshold", () => {
      const eps = 216 / 24389
      const below = xyzToLab(0.95047 * (eps - 1e-9), eps - 1e-9, 1.08883 * (eps - 1e-9))
      const above = xyzToLab(0.95047 * (eps + 1e-9), eps + 1e-9, 1.08883 * (eps + 1e-9))
      expectCloseTo(below.l, above.l, 4)
    })
  })

  describe("labToXyz", () => {
    it("should convert Lab to XYZ correctly", () => {
      const result = labToXyz(53.24, 80.09, 67.2)
      expectCloseTo(result.x, 0.4124, 3)
      expectCloseTo(result.y, 0.2126, 3)
      expectCloseTo(result.z, 0.0193, 3)
    })
  })

  describe("labToLch", () => {
    it("should convert Lab to LCh correctly", () => {
      const result = labToLch(53.24, 80.09, 67.2)
      expectCloseTo(result.l, 53.24, 1)
      expectCloseTo(result.c, 104.55, 1)
      expectCloseTo(result.h, 39.99, 1)
    })
  })

  describe("lchToLab", () => {
    it("should convert LCh to Lab correctly", () => {
      const result = lchToLab(53.24, 104.55, 39.99)
      expectCloseTo(result.l, 53.24, 1)
      expectCloseTo(result.a, 80.09, 1)
      expectCloseTo(result.b, 67.2, 1)
    })
  })

  describe("getRelativeLuminance", () => {
    it("should calculate relative luminance correctly", () => {
      const white = getRelativeLuminance(255, 255, 255)
      expectCloseTo(white, 1.0, 2)

      const black = getRelativeLuminance(0, 0, 0)
      expectCloseTo(black, 0.0, 2)

      const red = getRelativeLuminance(255, 0, 0)
      expectCloseTo(red, 0.2126, 3)
    })
  })

  describe("calculateWCAGContrast", () => {
    it("should calculate WCAG contrast correctly", () => {
      const white = { r: 255, g: 255, b: 255 }
      const black = { r: 0, g: 0, b: 0 }

      const contrast = calculateWCAGContrast(white, black)
      expectCloseTo(contrast, 21.0, 1)
    })

    it("should calculate contrast for similar colors", () => {
      const color1 = { r: 255, g: 0, b: 0 }
      const color2 = { r: 200, g: 0, b: 0 }

      const contrast = calculateWCAGContrast(color1, color2)
      expect(contrast).toBeGreaterThan(1.0)
      expect(contrast).toBeLessThan(5.0)
    })
  })

  describe("calculateAPCAContrast", () => {
    it("should calculate APCA contrast correctly", () => {
      const white = { r: 255, g: 255, b: 255 }
      const black = { r: 0, g: 0, b: 0 }

      const contrast = calculateAPCAContrast(white, black)
      expect(Math.abs(contrast)).toBeGreaterThan(0)
      expect(Math.abs(contrast)).toBeLessThan(200)
    })
  })

  describe("rgbToHex", () => {
    it("should convert RGB to hex correctly", () => {
      expect(rgbToHex(255, 0, 0)).toBe("#ff0000")
      expect(rgbToHex(0, 255, 0)).toBe("#00ff00")
      expect(rgbToHex(0, 0, 255)).toBe("#0000ff")
      expect(rgbToHex(128, 128, 128)).toBe("#808080")
    })
  })

  describe("Round-trip conversions", () => {
    it("should maintain accuracy in RGB -> XYZ -> RGB conversion", () => {
      const original = { r: 128, g: 64, b: 192 }
      const xyz = rgbToXyz(original.r, original.g, original.b)
      const converted = xyzToRgb(xyz.x, xyz.y, xyz.z)

      expectCloseTo(converted.r, original.r, 0)
      expectCloseTo(converted.g, original.g, 0)
      expectCloseTo(converted.b, original.b, 0)
    })

    it("should maintain accuracy in XYZ -> Lab -> XYZ conversion", () => {
      const original = { x: 0.3, y: 0.4, z: 0.2 }
      const lab = xyzToLab(original.x, original.y, original.z)
      const converted = labToXyz(lab.l, lab.a, lab.b)

      expectCloseTo(converted.x, original.x, 2)
      expectCloseTo(converted.y, original.y, 2)
      expectCloseTo(converted.z, original.z, 2)
    })
  })
})
