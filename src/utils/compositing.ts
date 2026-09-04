import type { BlendMode } from "../types/layers"
import { createRaster, type Raster } from "./raster"

export interface CompositeLayer {
  imageData: Raster
  visible: boolean
  opacity: number
  blendMode: BlendMode
  alpha: { visible: boolean } | null
}

export interface Size {
  width: number
  height: number
}

// Размер документа — наибольшие ширина и высота среди слоёв
export const getDocumentSize = (layers: { imageData: Raster }[]): Size => {
  let width = 0
  let height = 0
  for (const layer of layers) {
    width = Math.max(width, layer.imageData.width)
    height = Math.max(height, layer.imageData.height)
  }
  return { width, height }
}

// Слои меньше документа выравниваются по центру
export const getLayerOffset = (layer: Size, doc: Size) => ({
  x: Math.floor((doc.width - layer.width) / 2),
  y: Math.floor((doc.height - layer.height) / 2),
})

// Функции смешивания B(Cb, Cs) для нормированных значений 0..1
const BLEND_FUNCTIONS: Record<BlendMode, (cb: number, cs: number) => number> = {
  normal: (_cb, cs) => cs,
  multiply: (cb, cs) => cb * cs,
  screen: (cb, cs) => cb + cs - cb * cs,
  overlay: (cb, cs) => (cb <= 0.5 ? 2 * cb * cs : 1 - 2 * (1 - cb) * (1 - cs)),
}

// Сведение видимых слоёв (снизу вверх) в одно изображение в полном разрешении.
// Формулы W3C Compositing: Cs' = (1 - αb)·Cs + αb·B(Cb, Cs), затем source-over.
export function compositeLayers(layers: CompositeLayer[]): Raster {
  const size = getDocumentSize(layers)
  const out = createRaster(size.width, size.height)
  const dst = out.data

  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue

    const src = layer.imageData
    const srcData = src.data
    const offset = getLayerOffset(src, size)
    // Скрытый альфа-канал слоя — пиксели считаются непрозрачными
    const ignoreAlpha = layer.alpha !== null && !layer.alpha.visible
    const opacity = layer.opacity
    const blend = BLEND_FUNCTIONS[layer.blendMode]

    for (let y = 0; y < src.height; y++) {
      let s = y * src.width * 4
      let d = ((y + offset.y) * size.width + offset.x) * 4

      for (let x = 0; x < src.width; x++, s += 4, d += 4) {
        const as = (ignoreAlpha ? 1 : srcData[s + 3] / 255) * opacity
        if (as <= 0) continue

        const ab = dst[d + 3] / 255
        if (ab === 0) {
          // Под пикселем пусто — режим наложения не влияет
          dst[d] = srcData[s]
          dst[d + 1] = srcData[s + 1]
          dst[d + 2] = srcData[s + 2]
          dst[d + 3] = Math.round(as * 255)
          continue
        }

        const ao = as + ab * (1 - as)
        for (let c = 0; c < 3; c++) {
          const cs = srcData[s + c] / 255
          const cb = dst[d + c] / 255
          const mixed = (1 - ab) * cs + ab * blend(cb, cs)
          const co = as * mixed + (1 - as) * ab * cb
          dst[d + c] = Math.round((co / ao) * 255)
        }
        dst[d + 3] = Math.round(ao * 255)
      }
    }
  }

  return out
}
