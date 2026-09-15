// Масштаб просмотра (не меняет пиксели изображения)
export const MIN_SCALE = 12
export const MAX_SCALE = 300
export const ZOOM_STEPS = [12, 25, 33, 50, 67, 100, 150, 200, 300]

export const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value)))

// Следующая ступень масштаба вверх (+1) или вниз (-1)
export const stepScale = (scale: number, direction: 1 | -1) => {
  if (direction > 0) return ZOOM_STEPS.find((s) => s > scale) ?? MAX_SCALE
  return [...ZOOM_STEPS].reverse().find((s) => s < scale) ?? MIN_SCALE
}

// Масштаб, при котором изображение целиком помещается в область (не больше 100%)
export const fitScale = (image: { width: number; height: number }, area: { width: number; height: number }) => {
  if (!image.width || !image.height || area.width <= 0 || area.height <= 0) return 100
  const k = Math.min(area.width / image.width, area.height / image.height, 1)
  return clampScale(Math.floor(k * 100))
}
