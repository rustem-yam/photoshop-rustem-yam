import { encodeGB7 } from "./gb7"
import { toImageData, type Raster } from "./raster"

export type SaveFormat = "png" | "jpg" | "jpeg" | "gb7"

export const SAVE_FORMATS: Record<SaveFormat, { label: string; hint: string }> = {
  png: { label: "PNG", hint: "Без потерь, прозрачность сохраняется." },
  jpg: { label: "JPG", hint: "Сжатие с потерями, прозрачные области заливаются белым." },
  jpeg: { label: "JPEG", hint: "То же, что JPG, но с расширением .jpeg." },
  gb7: {
    label: "GB7",
    hint: "Оттенки серого, 7 бит. Прозрачность сохраняется маской (альфа ≥ 50% — пиксель виден).",
  },
}

export const formatFromFileName = (fileName: string): SaveFormat => {
  const ext = fileName.split(".").pop()?.toLowerCase()
  return ext === "jpg" || ext === "jpeg" || ext === "gb7" ? ext : "png"
}

export const baseName = (fileName: string) => fileName.replace(/\.[^.]+$/, "") || "image"

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Не удалось закодировать изображение"))), type, quality)
  )

export async function encodeImage(raster: Raster, format: SaveFormat, quality = 0.92): Promise<Blob> {
  if (format === "gb7") {
    return new Blob([encodeGB7(raster)], { type: "application/octet-stream" })
  }

  const source = document.createElement("canvas")
  source.width = raster.width
  source.height = raster.height
  source.getContext("2d")!.putImageData(toImageData(raster), 0, 0)

  if (format === "png") {
    return canvasToBlob(source, "image/png")
  }

  // JPEG не поддерживает прозрачность — накладываем изображение на белый фон
  const flat = document.createElement("canvas")
  flat.width = raster.width
  flat.height = raster.height
  const ctx = flat.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, flat.width, flat.height)
  ctx.drawImage(source, 0, 0)
  return canvasToBlob(flat, "image/jpeg", quality)
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
