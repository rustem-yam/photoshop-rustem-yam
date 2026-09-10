// Глубина цвета (бит на пиксель) по заголовку файла

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// Число каналов по типу цвета PNG (IHDR color type)
const PNG_CHANNELS: Record<number, number> = {
  0: 1, // оттенки серого
  2: 3, // RGB
  3: 1, // палитра (индекс)
  4: 2, // серый + альфа
  6: 4, // RGBA
}

export const isPng = (bytes: Uint8Array) => PNG_SIGNATURE.every((b, i) => bytes[i] === b)
export const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8

// PNG: IHDR всегда первый чанк — байт 24 глубина канала, байт 25 тип цвета
export function getPngDepth(bytes: Uint8Array): number | null {
  if (bytes.length < 26 || !isPng(bytes)) return null
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (chunkType !== "IHDR") return null
  const bitDepth = bytes[24]
  const channels = PNG_CHANNELS[bytes[25]]
  return channels ? bitDepth * channels : null
}

// Маркеры SOF (начало кадра): C0-CF, кроме C4 (DHT), C8 (JPG), CC (DAC)
const isSofMarker = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc

// JPEG: в сегменте SOF — точность (бит на компонент) и число компонентов
export function getJpegDepth(bytes: Uint8Array): number | null {
  if (!isJpeg(bytes)) return null
  let i = 2
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return null
    const marker = bytes[i + 1]
    if (marker === 0xff) {
      i += 1 // байт-заполнитель
      continue
    }
    // Маркеры без длины
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3]
    if (isSofMarker(marker)) {
      if (i + 9 >= bytes.length) return null
      const precision = bytes[i + 4]
      const components = bytes[i + 9]
      return precision * components
    }
    if (marker === 0xda) return null // начались данные, SOF не найден
    i += 2 + length
  }
  return null
}

export function detectDepth(bytes: Uint8Array): number | null {
  return getPngDepth(bytes) ?? getJpegDepth(bytes)
}
