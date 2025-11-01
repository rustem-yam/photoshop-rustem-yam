import type { Layer, BlendMode } from "../types/layers"
import UPNG from "upng-js"

// Создание предварительного просмотра для слоя
// Вспомогательная функция для создания слоя с обработкой альфа-канала
const createLayerWithAlpha = (imageData: ImageData, name: string): Layer => {
  const hasAlpha = Array.from(imageData.data).some((value, index) => (index + 1) % 4 === 0 && value !== 255)

  let alpha = null
  if (hasAlpha) {
    // Создаем отдельный альфа-канал из альфа-компонентов изображения
    const alphaCanvas = document.createElement("canvas")
    alphaCanvas.width = imageData.width
    alphaCanvas.height = imageData.height
    const alphaCtx = alphaCanvas.getContext("2d")

    if (alphaCtx) {
      const alphaImageData = alphaCtx.createImageData(imageData.width, imageData.height)
      // Копируем только альфа-канал, преобразуя его в градации серого
      for (let i = 0; i < imageData.data.length; i += 4) {
        const alphaValue = imageData.data[i + 3]
        alphaImageData.data[i] = alphaValue     // R
        alphaImageData.data[i + 1] = alphaValue // G
        alphaImageData.data[i + 2] = alphaValue // B
        alphaImageData.data[i + 3] = 255        // A (полная непрозрачность для отображения)
      }

      alpha = {
        imageData: alphaImageData,
        preview: createAlphaPreview(alphaImageData),
        visible: true
      }
    }
  }

  return {
    id: `layer_${Date.now()}`,
    name,
    imageData,
    color: null,
    opacity: 1,
    visible: true,
    blendMode: "normal",
    preview: "",
    alpha,
  }
}

export const createLayerPreview = (layer: Layer, size: number = 64): string => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")

  if (!ctx) return ""
  if (layer.imageData) {
    // Если у слоя есть отдельный альфа-канал и он скрыт — отрисовываем превью без прозрачности
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = layer.imageData.width
    tempCanvas.height = layer.imageData.height
    const tempCtx = tempCanvas.getContext("2d")

    if (tempCtx) {
      if (layer.alpha?.imageData && layer.alpha.visible === false) {
        // Копируем imageData и делаем все пиксели полностью непрозрачными
        const copy = tempCtx.createImageData(layer.imageData.width, layer.imageData.height)
        copy.data.set(layer.imageData.data)
        for (let i = 3; i < copy.data.length; i += 4) {
          copy.data[i] = 255
        }
        tempCtx.putImageData(copy, 0, 0)
      } else {
        tempCtx.putImageData(layer.imageData, 0, 0)
      }
      ctx.drawImage(tempCanvas, 0, 0, size, size)
    }
  } else if (layer.color) {
    ctx.fillStyle = layer.color
    ctx.fillRect(0, 0, size, size)
  }

  return canvas.toDataURL()
}

// Создание предварительного просмотра для альфа-канала слоя
export const createAlphaPreview = (imageData: ImageData, size: number = 64): string => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")

  if (!ctx) return ""

  // Создаем временный canvas для масштабирования
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height
  const tempCtx = tempCanvas.getContext("2d")

  if (tempCtx) {
    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0, size, size)
  }

  return canvas.toDataURL()
}

// Создание слоя из изображения
export const createLayerFromImage = async (file: File, name: string): Promise<Layer> => {
  // Проверяем тип файла
  if (file.name.toLowerCase().endsWith('.gb7')) {
    // Для .gb7 формата используем специальную обработку
    const arrayBuffer = await file.arrayBuffer()
    const gb7Data = UPNG.decode(arrayBuffer) // Декодируем .gb7 файл
    
    const canvas = document.createElement("canvas")
    canvas.width = gb7Data.width
    canvas.height = gb7Data.height
    const ctx = canvas.getContext("2d")
    
    if (!ctx) throw new Error("Не удалось получить контекст canvas")

    // Создаем ImageData из данных .gb7
    const imageData = ctx.createImageData(gb7Data.width, gb7Data.height)
    imageData.data.set(new Uint8ClampedArray(gb7Data.data))
    
    return createLayerWithAlpha(imageData, name)
  }

  // Для остальных форматов используем стандартную обработку
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })
  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) throw new Error("Не удалось получить контекст canvas")

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Проверяем, есть ли альфа-канал в изображении (если хотя бы один пиксель имеет альфу != 255)
  const layer = createLayerWithAlpha(imageData, name)
  layer.preview = createLayerPreview(layer)

  URL.revokeObjectURL(img.src)
  return layer
}

// Создание слоя из цвета
export const createLayerFromColor = (color: string, name: string, width: number, height: number): Layer => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  if (!ctx) throw new Error("Не удалось получить контекст canvas")

  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)

  const layer: Layer = {
    id: `layer_${Date.now()}`,
    name,
    imageData,
    color,
    opacity: 1,
    visible: true,
    blendMode: "normal",
    preview: "",
    alpha: null,
  }

  layer.preview = createLayerPreview(layer)
  return layer
}

// Alpha creation utility removed - alpha channels are now expected to come embedded in source images (PNG)
// If you later need to add the ability to import separate alpha masks, reintroduce a function here.

// Применение режима наложения
export const applyBlendMode = (
  baseColor: [number, number, number],
  overlayColor: [number, number, number],
  blendMode: BlendMode
): [number, number, number] => {
  const [r1, g1, b1] = baseColor.map((c) => c / 255)
  const [r2, g2, b2] = overlayColor.map((c) => c / 255)

  let result: [number, number, number]

  switch (blendMode) {
    case "normal":
      result = [r2, g2, b2]
      break
    case "multiply":
      result = [r1 * r2, g1 * g2, b1 * b2]
      break
    case "screen":
      result = [1 - (1 - r1) * (1 - r2), 1 - (1 - g1) * (1 - g2), 1 - (1 - b1) * (1 - b2)]
      break
    case "overlay":
      result = [
        r1 < 0.5 ? 2 * r1 * r2 : 1 - 2 * (1 - r1) * (1 - r2),
        g1 < 0.5 ? 2 * g1 * g2 : 1 - 2 * (1 - g1) * (1 - g2),
        b1 < 0.5 ? 2 * b1 * b2 : 1 - 2 * (1 - b1) * (1 - b2),
      ]
      break
    default:
      result = [r2, g2, b2]
  }

  return result.map((c) => Math.round(Math.max(0, Math.min(255, c * 255)))) as [number, number, number]
}

// Отрисовка всех слоев на canvas
export const renderLayersToCanvas = (
  canvas: HTMLCanvasElement,
  layers: Layer[],
  _scale: number = 100,
  isTransparent: boolean = false
) => {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const scaledW = Math.round(canvas.width)
  const scaledH = Math.round(canvas.height)

  // Заполняем фон
  ctx.clearRect(0, 0, scaledW, scaledH)
  if (isTransparent) {
    const block = 7
    for (let y = 0; y < scaledH; y += block) {
      for (let x = 0; x < scaledW; x += block) {
        ctx.fillStyle = (Math.floor(x / block) + Math.floor(y / block)) % 2 === 0 ? "#fff" : "#ccc"
        ctx.fillRect(x, y, block, block)
      }
    }
  } else {
    ctx.fillStyle = "#262626"
    ctx.fillRect(0, 0, scaledW, scaledH)
  }

  // Начинаем композицию: получаем базовые пиксели из текущого холста
  let baseImage = ctx.getImageData(0, 0, scaledW, scaledH)

  // Отрисовываем видимые слои снизу вверх
  const visibleLayers = layers.filter((layer) => layer.visible)

  for (const layer of visibleLayers) {
    if (!layer.imageData) continue

    // Создаем временный canvas для исходного слоя
    const srcCanvas = document.createElement("canvas")
    srcCanvas.width = layer.imageData.width
    srcCanvas.height = layer.imageData.height
    const srcCtx = srcCanvas.getContext("2d")
    if (!srcCtx) continue
    srcCtx.putImageData(layer.imageData, 0, 0)

    // Масштабируем слой на canvas размера target
    const scaledCanvas = document.createElement("canvas")
    scaledCanvas.width = scaledW
    scaledCanvas.height = scaledH
    const scaledCtx = scaledCanvas.getContext("2d")
    if (!scaledCtx) continue

  // Вычисляем размеры и смещение: отрисовываем слой в его собственном масштабе
  const layerScaledW = Math.round(layer.imageData.width * (_scale / 100))
  const layerScaledH = Math.round(layer.imageData.height * (_scale / 100))
  const offsetX = Math.round((scaledW - layerScaledW) / 2)
  const offsetY = Math.round((scaledH - layerScaledH) / 2)

    // Draw scaled image into scaledCanvas
    scaledCtx.drawImage(srcCanvas, 0, 0, layer.imageData.width, layer.imageData.height, offsetX, offsetY, layerScaledW, layerScaledH)

    const layerData = scaledCtx.getImageData(0, 0, scaledW, scaledH)

    // Перебор пикселей и применение режима наложения + непрозрачности + альфа-канала
    const baseData = baseImage.data
    const overlayData = layerData.data

    for (let i = 0; i < baseData.length; i += 4) {
      const br = baseData[i]
      const bg = baseData[i + 1]
      const bb = baseData[i + 2]
      const ba = baseData[i + 3] / 255

      const or = overlayData[i]
      const og = overlayData[i + 1]
      const ob = overlayData[i + 2]
      const oa = overlayData[i + 3] / 255

      // effectiveAlpha — итоговая непрозрачность оверлея на этом пикселе
      // По умолчанию используем непрозрачность слоя (opacity).
      let effectiveAlpha = layer.opacity

      if (layer.alpha?.imageData) {
        // Слой имеет отдельный alpha-канал, учитываем его только если он видим.
        if (layer.alpha.visible) {
          // сначала учитываем встроенную прозрачность пикселей (oa)
          effectiveAlpha *= oa
          // затем домножаем на значение маски (градация серого в отдельном alpha.imageData)
          const alphaData = layer.alpha.imageData.data
          const alphaGray = alphaData[i] / 255 // используем R канал маски
          effectiveAlpha *= alphaGray
        } else {
          // alpha присутствует, но скрыт — игнорируем встроенную прозрачность изображения
          // (оставляем только opacity слоя)
          // effectiveAlpha уже равен layer.opacity
        }
      } else {
        // Нет отдельного alpha-канала — используем встроенную прозрачность изображения
        effectiveAlpha *= oa
      }

      if (effectiveAlpha <= 0) continue

      const blended = applyBlendMode([br, bg, bb], [or, og, ob], layer.blendMode)

      // Линеарное смешивание: result = blended * alpha + base * (1 - alpha)
      const r = Math.round(blended[0] * effectiveAlpha + br * (1 - effectiveAlpha))
      const g = Math.round(blended[1] * effectiveAlpha + bg * (1 - effectiveAlpha))
      const b = Math.round(blended[2] * effectiveAlpha + bb * (1 - effectiveAlpha))

      // Итоговая альфа
      const outA = Math.round((ba + effectiveAlpha * (1 - ba)) * 255)

      baseData[i] = r
      baseData[i + 1] = g
      baseData[i + 2] = b
      baseData[i + 3] = outA
    }

    // Обновляем baseImage для следующего слоя
    baseImage.data.set(baseData)
  }

  // Записываем итог обратно на canvas
  ctx.putImageData(baseImage, 0, 0)
}
