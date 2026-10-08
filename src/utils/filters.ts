import { createRaster, type Raster } from "./raster"
import type { ProgressCallback } from "./interpolation"

export type EdgeMode = "extend" | "mirror" | "wrap" | "zero" | "skip"
export type FilterKind = "convolution" | "median"

export interface ChannelMask {
  r: boolean
  g: boolean
  b: boolean
  a: boolean
}

export interface FilterOptions {
  kind: FilterKind
  kernel: number[] // 3×3 построчно: [a11, a12, a13, a21, ...]
  divisor: number // результат свёртки делится на это число
  offset: number // и к нему прибавляется смещение
  absolute: boolean // брать модуль (для операторов выделения границ)
  channels: ChannelMask
  edge: EdgeMode
}

export type FilterPresetId = "identity" | "sharpen" | "gaussian" | "box" | "prewittX" | "prewittY" | "median"

interface FilterPreset {
  name: string
  description: string
  kind: FilterKind
  kernel: number[]
  divisor: number
  offset: number
  absolute: boolean
}

export const FILTER_PRESETS: Record<FilterPresetId, FilterPreset> = {
  identity: {
    name: "Тождественное отображение",
    description: "Изображение не меняется — удобно как основа для своего ядра.",
    kind: "convolution",
    kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    divisor: 1,
    offset: 0,
    absolute: false,
  },
  sharpen: {
    name: "Повышение резкости",
    description: "Усиливает центральный пиксель относительно соседей.",
    kind: "convolution",
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    divisor: 1,
    offset: 0,
    absolute: false,
  },
  gaussian: {
    name: "Фильтр Гаусса 3×3",
    description: "Размытие с весами, убывающими от центра (1-2-1).",
    kind: "convolution",
    kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1],
    divisor: 16,
    offset: 0,
    absolute: false,
  },
  box: {
    name: "Прямоугольное размытие",
    description: "Среднее арифметическое 9 пикселей.",
    kind: "convolution",
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    divisor: 9,
    offset: 0,
    absolute: false,
  },
  prewittX: {
    name: "Оператор Прюитта X",
    description: "Горизонтальный градиент — выделяет вертикальные границы.",
    kind: "convolution",
    kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
    divisor: 1,
    offset: 0,
    absolute: true,
  },
  prewittY: {
    name: "Оператор Прюитта Y",
    description: "Вертикальный градиент — выделяет горизонтальные границы.",
    kind: "convolution",
    kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
    divisor: 1,
    offset: 0,
    absolute: true,
  },
  median: {
    name: "Медианный фильтр 3×3",
    description: "Медиана 9 соседей — убирает импульсный шум, сохраняя границы.",
    kind: "median",
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    divisor: 1,
    offset: 0,
    absolute: false,
  },
}

export const EDGE_MODES: Record<EdgeMode, { name: string; description: string }> = {
  extend: { name: "Продолжение края", description: "За краем повторяется крайний пиксель" },
  mirror: { name: "Зеркальное отражение", description: "За краем — зеркальная копия изображения" },
  wrap: { name: "Заворачивание", description: "За левым краем — правый, за верхним — нижний" },
  zero: { name: "Нулевые пиксели", description: "За краем — чёрные прозрачные пиксели (0)" },
  skip: { name: "Не обрабатывать края", description: "Крайние пиксели остаются без изменений" },
}

export const presetOptions = (id: FilterPresetId, channels: ChannelMask, edge: EdgeMode): FilterOptions => {
  const p = FILTER_PRESETS[id]
  return { kind: p.kind, kernel: [...p.kernel], divisor: p.divisor, offset: p.offset, absolute: p.absolute, channels, edge }
}

// Какой пресет соответствует параметрам (или null — пользовательское ядро)
export function matchPreset(options: FilterOptions): FilterPresetId | null {
  for (const id of Object.keys(FILTER_PRESETS) as FilterPresetId[]) {
    const p = FILTER_PRESETS[id]
    if (p.kind !== options.kind) continue
    if (p.kind === "median") return id
    if (
      p.divisor === options.divisor &&
      p.offset === options.offset &&
      p.absolute === options.absolute &&
      p.kernel.every((v, i) => v === options.kernel[i])
    ) {
      return id
    }
  }
  return null
}

export const kernelSum = (kernel: number[]) => kernel.reduce((a, b) => a + b, 0)

// Индексы соседей слева/справа (или сверху/снизу) для каждой позиции; -1 — «за краем, ноль»
function neighbours(size: number, edge: EdgeMode) {
  const prev = new Int32Array(size)
  const next = new Int32Array(size)
  for (let i = 0; i < size; i++) {
    const p = i - 1
    const n = i + 1
    switch (edge) {
      case "mirror":
        prev[i] = p >= 0 ? p : Math.min(1, size - 1)
        next[i] = n < size ? n : Math.max(size - 2, 0)
        break
      case "wrap":
        prev[i] = (p + size) % size
        next[i] = n % size
        break
      case "zero":
        prev[i] = p >= 0 ? p : -1
        next[i] = n < size ? n : -1
        break
      default: // extend, skip
        prev[i] = Math.max(0, p)
        next[i] = Math.min(size - 1, n)
    }
  }
  return { prev, next }
}

// Медиана 9 значений (сортировка вставками небольшого массива)
function median9(values: Float64Array): number {
  for (let i = 1; i < 9; i++) {
    const v = values[i]
    let j = i - 1
    while (j >= 0 && values[j] > v) {
      values[j + 1] = values[j]
      j--
    }
    values[j + 1] = v
  }
  return values[4]
}

const PROGRESS_STEP = 32

export function applyFilter(src: Raster, options: FilterOptions, onProgress?: ProgressCallback): Raster {
  const { width: w, height: h } = src
  const s = src.data
  const out = createRaster(w, h)
  const d = out.data
  // Начинаем с копии: невыбранные каналы (и края в режиме «не обрабатывать») остаются как были
  d.set(s)

  const mask = [options.channels.r, options.channels.g, options.channels.b, options.channels.a]
  const channels = [0, 1, 2, 3].filter((c) => mask[c])
  if (channels.length === 0) return out

  const { kind, kernel, offset, absolute, edge } = options
  const divisor = options.divisor === 0 ? 1 : options.divisor
  const skipEdges = edge === "skip"
  const cols = neighbours(w, edge)
  const rows = neighbours(h, edge)
  const window = new Float64Array(9)
  const rowIdx = [0, 0, 0]
  const colIdx = [0, 0, 0]

  for (let y = 0; y < h; y++) {
    if (onProgress && y % PROGRESS_STEP === 0) onProgress(y / h)
    if (skipEdges && (y === 0 || y === h - 1)) continue
    rowIdx[0] = rows.prev[y]
    rowIdx[1] = y
    rowIdx[2] = rows.next[y]

    for (let x = 0; x < w; x++) {
      if (skipEdges && (x === 0 || x === w - 1)) continue
      colIdx[0] = cols.prev[x]
      colIdx[1] = x
      colIdx[2] = cols.next[x]
      const o = (y * w + x) * 4

      for (const c of channels) {
        // Окно 3×3: строки сверху вниз, столбцы слева направо — в том же порядке, что и ядро
        let k = 0
        let sum = 0
        for (let ky = 0; ky < 3; ky++) {
          const ry = rowIdx[ky]
          for (let kx = 0; kx < 3; kx++, k++) {
            const cx = colIdx[kx]
            const v = ry < 0 || cx < 0 ? 0 : s[(ry * w + cx) * 4 + c]
            if (kind === "median") window[k] = v
            else sum += kernel[k] * v
          }
        }

        let value: number
        if (kind === "median") {
          value = median9(window)
        } else {
          value = sum / divisor
          if (absolute) value = Math.abs(value)
          value += offset
        }
        d[o + c] = Math.round(value) // Uint8ClampedArray ограничит до 0..255
      }
    }
  }

  onProgress?.(1)
  return out
}
