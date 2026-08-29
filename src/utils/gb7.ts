import { createRaster, type Raster } from "./raster"

// Формат GrayBit-7 (.gb7)
// Заголовок 12 байт:
//   0-3   сигнатура 0x47 0x42 0x37 0x1D ("GB7" + GS)
//   4     версия (0x01)
//   5     флаги: бит 0 — есть маска, остальные биты зарезервированы
//   6-7   ширина (big-endian)
//   8-9   высота (big-endian)
//   10-11 зарезервировано (0x0000)
// Далее по 1 байту на пиксель, построчно:
//   биты 0-6 — яркость 0..127
//   бит 7    — маска (1 — пиксель виден, 0 — прозрачный), учитывается только при флаге маски

export const GB7_SIGNATURE = [0x47, 0x42, 0x37, 0x1d] as const
export const GB7_VERSION = 0x01
export const GB7_HEADER_SIZE = 12
const MASK_FLAG = 0x01

export interface GB7Header {
  version: number
  flags: number
  width: number
  height: number
  hasMask: boolean
}

const toBytes = (input: ArrayBuffer | Uint8Array): Uint8Array =>
  input instanceof Uint8Array ? input : new Uint8Array(input)

export function readGB7Header(input: ArrayBuffer | Uint8Array): GB7Header {
  const bytes = toBytes(input)
  if (bytes.length < GB7_HEADER_SIZE) {
    throw new Error("Файл .gb7 слишком короткий")
  }
  for (let i = 0; i < GB7_SIGNATURE.length; i++) {
    if (bytes[i] !== GB7_SIGNATURE[i]) {
      throw new Error("Неверная сигнатура .gb7 файла")
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const version = view.getUint8(4)
  const flags = view.getUint8(5)
  const width = view.getUint16(6, false)
  const height = view.getUint16(8, false)

  if (version !== GB7_VERSION) {
    throw new Error(`Неподдерживаемая версия .gb7: ${version}`)
  }
  if (width === 0 || height === 0) {
    throw new Error("Некорректный размер изображения в .gb7")
  }

  return { version, flags, width, height, hasMask: (flags & MASK_FLAG) !== 0 }
}

// 7-битная яркость -> 8 бит
const gray7to8 = (value: number) => Math.round((value * 255) / 127)

export function decodeGB7(input: ArrayBuffer | Uint8Array): { header: GB7Header; raster: Raster } {
  const bytes = toBytes(input)
  const header = readGB7Header(bytes)
  const { width, height, hasMask } = header
  const pixelCount = width * height

  if (bytes.length < GB7_HEADER_SIZE + pixelCount) {
    throw new Error("Файл .gb7 повреждён: не хватает данных пикселей")
  }

  const raster = createRaster(width, height)
  const out = raster.data
  for (let i = 0; i < pixelCount; i++) {
    const byte = bytes[GB7_HEADER_SIZE + i]
    const gray = gray7to8(byte & 0x7f)
    const visible = !hasMask || (byte & 0x80) !== 0
    const o = i * 4
    // Яркость сохраняем и под маской: при отключении альфа-канала её будет видно
    out[o] = gray
    out[o + 1] = gray
    out[o + 2] = gray
    out[o + 3] = visible ? 255 : 0
  }

  return { header, raster }
}
