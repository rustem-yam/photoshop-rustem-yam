// Растровое изображение RGBA 8 бит на канал.
// ImageData подходит под этот интерфейс, но функции обработки работают с Raster,
// чтобы их можно было запускать в Web Worker и в тестах (где нет ImageData).
export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray<ArrayBuffer>
}

export const createRaster = (width: number, height: number): Raster => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
})

export const cloneRaster = (raster: Raster): Raster => ({
  width: raster.width,
  height: raster.height,
  data: new Uint8ClampedArray(raster.data),
})

export const toImageData = (raster: Raster): ImageData => {
  if (typeof ImageData !== "undefined" && raster instanceof ImageData) return raster
  return new ImageData(raster.data, raster.width, raster.height)
}

// Есть ли в изображении хотя бы один не полностью непрозрачный пиксель
export const rasterHasAlpha = (raster: Raster): boolean => {
  const data = raster.data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true
  }
  return false
}
