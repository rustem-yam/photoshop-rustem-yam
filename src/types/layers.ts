export type BlendMode = "normal" | "multiply" | "screen" | "overlay"

export interface Layer {
  id: string
  name: string
  // Пиксели слоя; альфа-канал хранится в A-компоненте
  imageData: ImageData
  color: string | null
  opacity: number
  visible: boolean
  blendMode: BlendMode
  preview: string // DataURL для предварительного просмотра
  // Есть у слоёв с прозрачностью: превью альфа-канала и его видимость
  alpha: {
    preview: string
    visible: boolean
  } | null
}

export interface LayersState {
  layers: Layer[] // снизу вверх: layers[0] — нижний слой
  activeLayerId: string | null
}

export const BLEND_MODES: Record<BlendMode, { name: string; description: string }> = {
  normal: {
    name: "Обычный",
    description: "Стандартный режим наложения. Пиксели верхнего слоя полностью заменяют пиксели нижнего слоя.",
  },
  multiply: {
    name: "Умножение",
    description: "Умножает цвета слоев. Результат всегда темнее исходных цветов. Белый цвет становится прозрачным.",
  },
  screen: {
    name: "Экран",
    description:
      "Инвертирует, умножает и снова инвертирует цвета. Результат всегда светлее исходных цветов. Черный цвет становится прозрачным.",
  },
  overlay: {
    name: "Наложение",
    description:
      "Комбинирует умножение и экран. Темные области становятся темнее, светлые - светлее. Увеличивает контраст.",
  },
}
