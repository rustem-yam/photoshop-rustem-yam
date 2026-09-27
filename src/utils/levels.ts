import { createRaster, type Raster } from "./raster"

export interface LevelsChannelParams {
  black: number // входная чёрная точка 0..254
  white: number // входная белая точка 1..255
  gamma: number // гамма средних тонов 0.10..9.99 (больше 1 — светлее)
}

export type LevelsChannel = "master" | "r" | "g" | "b"
export type LevelsParams = Record<LevelsChannel, LevelsChannelParams>

export const GAMMA_MIN = 0.1
export const GAMMA_MAX = 9.99

export const DEFAULT_CHANNEL_LEVELS: LevelsChannelParams = { black: 0, white: 255, gamma: 1 }

export const defaultLevels = (): LevelsParams => ({
  master: { ...DEFAULT_CHANNEL_LEVELS },
  r: { ...DEFAULT_CHANNEL_LEVELS },
  g: { ...DEFAULT_CHANNEL_LEVELS },
  b: { ...DEFAULT_CHANNEL_LEVELS },
})

export const clampGamma = (gamma: number) => Math.min(GAMMA_MAX, Math.max(GAMMA_MIN, gamma))

const isIdentityChannel = (p: LevelsChannelParams) => p.black === 0 && p.white === 255 && p.gamma === 1

export const isIdentityLevels = (params: LevelsParams) =>
  (Object.keys(params) as LevelsChannel[]).every((c) => isIdentityChannel(params[c]))

// out = 255 · ((in − black) / (white − black))^(1/γ), с ограничением 0..1
export function buildChannelLut({ black, white, gamma }: LevelsChannelParams): Uint8Array {
  const lut = new Uint8Array(256)
  const range = Math.max(1, white - black)
  const invGamma = 1 / clampGamma(gamma)
  for (let v = 0; v < 256; v++) {
    const t = Math.min(1, Math.max(0, (v - black) / range))
    lut[v] = Math.round(255 * Math.pow(t, invGamma))
  }
  return lut
}

// Итоговые таблицы для R, G, B: сначала уровни канала, затем общий (Master)
export function buildLevelsLuts(params: LevelsParams): [Uint8Array, Uint8Array, Uint8Array] {
  const master = buildChannelLut(params.master)
  return (["r", "g", "b"] as const).map((c) => {
    const own = buildChannelLut(params[c])
    const lut = new Uint8Array(256)
    for (let v = 0; v < 256; v++) lut[v] = master[own[v]]
    return lut
  }) as [Uint8Array, Uint8Array, Uint8Array]
}

// Применение уровней; альфа-канал не меняется
export function applyLevels(raster: Raster, params: LevelsParams): Raster {
  const [lr, lg, lb] = buildLevelsLuts(params)
  const out = createRaster(raster.width, raster.height)
  const src = raster.data
  const dst = out.data
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = lr[src[i]]
    dst[i + 1] = lg[src[i + 1]]
    dst[i + 2] = lb[src[i + 2]]
    dst[i + 3] = src[i + 3]
  }
  return out
}

// Положение серого ползунка: уровень, который после коррекции станет 50% серым
export const gammaToMidpoint = (black: number, white: number, gamma: number) =>
  black + (white - black) * Math.pow(0.5, clampGamma(gamma))

export function midpointToGamma(black: number, white: number, midpoint: number): number {
  const t = (midpoint - black) / Math.max(1, white - black)
  if (t <= 0) return GAMMA_MAX
  if (t >= 1) return GAMMA_MIN
  return clampGamma(Math.log(t) / Math.log(0.5))
}
