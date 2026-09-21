export type ToolType = "hand" | "pipette" | "layers" | "channels" | "none"

export interface Tool {
  id: ToolType
  name: string
  description: string
  icon: string
  hotkey: string
}

export const TOOLS: Record<ToolType, Tool> = {
  hand: {
    id: "hand",
    name: "Рука",
    description: "Перемещение изображения",
    icon: "✋",
    hotkey: "H",
  },
  pipette: {
    id: "pipette",
    name: "Пипетка",
    description: "Выбор цвета",
    icon: "🎨",
    hotkey: "I",
  },
  layers: {
    id: "layers",
    name: "Слои",
    description: "Управление слоями и альфа-каналами",
    icon: "📚",
    hotkey: "L",
  },
  channels: {
    id: "channels",
    name: "Каналы",
    description: "Просмотр и включение цветовых каналов",
    icon: "🌈",
    hotkey: "C",
  },
  none: {
    id: "none",
    name: "Нет",
    description: "Обычный режим",
    icon: "↖️",
    hotkey: "Escape",
  },
}

// Пиксель изображения под курсором пипетки
export interface PickedPixel {
  x: number
  y: number
  r: number
  g: number
  b: number
  a: number
}

export interface ColorInfo {
  r: number
  g: number
  b: number
  a: number
  x: number
  y: number
  xyz: { x: number; y: number; z: number }
  lab: { l: number; a: number; b: number }
  lch: { l: number; c: number; h: number }
}

export interface PipetteState {
  primaryColor: ColorInfo | null
  secondaryColor: ColorInfo | null
  isActive: boolean
}

export interface HandState {
  isActive: boolean
  isDragging: boolean
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}
