// CIE D65 стандартный источник света для цветовых преобразований
const D65_WHITE = { x: 0.95047, y: 1.0, z: 1.08883 }

// Нормализация RGB значений из диапазона 0-255 в 0-1
export function normalizeRGB(r: number, g: number, b: number): { r: number; g: number; b: number } {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
  }
}

export function denormalizeRGB(r: number, g: number, b: number): { r: number; g: number; b: number } {
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

// sRGB гамма-коррекция для преобразования в линейное пространство
function gammaCorrect(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
}

function inverseGammaCorrect(value: number): number {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055
}

// Преобразование sRGB в CIE XYZ цветовое пространство
export function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  const { r: rNorm, g: gNorm, b: bNorm } = normalizeRGB(r, g, b)

  const rLinear = gammaCorrect(rNorm)
  const gLinear = gammaCorrect(gNorm)
  const bLinear = gammaCorrect(bNorm)

  const x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375
  const y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175
  const z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041

  return { x, y, z }
}

export function xyzToRgb(x: number, y: number, z: number): { r: number; g: number; b: number } {
  const rLinear = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  const gLinear = x * -0.969266 + y * 1.8760108 + z * 0.041556
  const bLinear = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

  const r = Math.max(0, Math.min(1, inverseGammaCorrect(rLinear)))
  const g = Math.max(0, Math.min(1, inverseGammaCorrect(gLinear)))
  const b = Math.max(0, Math.min(1, inverseGammaCorrect(bLinear)))

  return denormalizeRGB(r, g, b)
}

export function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
  const fx = x / D65_WHITE.x
  const fy = y / D65_WHITE.y
  const fz = z / D65_WHITE.z

  const fx3 = Math.pow(fx, 1 / 3)
  const fy3 = Math.pow(fy, 1 / 3)
  const fz3 = Math.pow(fz, 1 / 3)

  const l = 116 * fy3 - 16
  const a = 500 * (fx3 - fy3)
  const b = 200 * (fy3 - fz3)

  return { l, a, b }
}

export function labToXyz(l: number, a: number, b: number): { x: number; y: number; z: number } {
  const fy = (l + 16) / 116
  const fx = a / 500 + fy
  const fz = fy - b / 200

  const fx3 = Math.pow(fx, 3)
  const fy3 = Math.pow(fy, 3)
  const fz3 = Math.pow(fz, 3)

  const x = fx3 > 0.008856 ? fx3 : (fx - 16 / 116) / 7.787
  const y = fy3 > 0.008856 ? fy3 : (fy - 16 / 116) / 7.787
  const z = fz3 > 0.008856 ? fz3 : (fz - 16 / 116) / 7.787

  return {
    x: x * D65_WHITE.x,
    y: y * D65_WHITE.y,
    z: z * D65_WHITE.z,
  }
}

export function labToOklch(l: number, a: number, b: number): { l: number; c: number; h: number } {
  const l_ok = l
  const a_ok = a
  const b_ok = b

  const c = Math.sqrt(a_ok * a_ok + b_ok * b_ok)
  const h = (Math.atan2(b_ok, a_ok) * 180) / Math.PI

  return { l: l_ok, c, h: h < 0 ? h + 360 : h }
}

export function oklchToLab(l: number, c: number, h: number): { l: number; a: number; b: number } {
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  return { l, a, b }
}

export function getColorInfo(
  r: number,
  g: number,
  b: number,
  x: number,
  y: number
): {
  r: number
  g: number
  b: number
  x: number
  y: number
  xyz: { x: number; y: number; z: number }
  lab: { l: number; a: number; b: number }
  oklch: { l: number; c: number; h: number }
} {
  const xyz = rgbToXyz(r, g, b)
  const lab = xyzToLab(xyz.x, xyz.y, xyz.z)
  const oklch = labToOklch(lab.l, lab.a, lab.b)

  return {
    r,
    g,
    b,
    x,
    y,
    xyz,
    lab,
    oklch,
  }
}

// Вычисление относительной яркости для WCAG контрастности
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const { r: rNorm, g: gNorm, b: bNorm } = normalizeRGB(r, g, b)

  const rLinear = gammaCorrect(rNorm)
  const gLinear = gammaCorrect(gNorm)
  const bLinear = gammaCorrect(bNorm)

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

// WCAG 2.1 контрастность по критерию G18
export function calculateWCAGContrast(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b)
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

export function calculateAPCAContrast(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b)
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b)

  const s1 = l1 > 0.5 ? 0.56 : 0.57
  const s2 = l2 > 0.5 ? 0.56 : 0.57

  const c1 = Math.pow(l1, s1)
  const c2 = Math.pow(l2, s2)

  const contrast = Math.abs(c1 - c2) * 1.14

  return l1 > l2 ? contrast : -contrast
}

export function formatColorValue(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
