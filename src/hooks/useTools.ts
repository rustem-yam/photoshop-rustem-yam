import { useState, useCallback, useEffect } from "react"
import type { ToolType, PipetteState, HandState, ColorInfo, PickedPixel } from "@/types/tools"
import { getColorInfo } from "@/utils/colorUtils"

interface UseToolsParams {
  canvasWidth?: number
  canvasHeight?: number
  viewportWidth?: number
  viewportHeight?: number
  onToolChange?: (tool: ToolType) => void
  externalActiveTool?: ToolType
}

// true, если событие пришло из поля ввода или открытого диалога
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target.closest("input, textarea, select, [role='dialog'], [role='listbox']") !== null
}

// Сдвиг рукой: изображение можно увести в любую сторону, пока на экране остаётся хотя бы 100 px
const PAN_MARGIN = 100
export const clampPan = (offset: number, canvasSize: number, viewportSize: number) => {
  const limit = Math.max(0, (canvasSize + viewportSize) / 2 - PAN_MARGIN)
  return Math.max(-limit, Math.min(limit, offset))
}

// Хук для управления инструментами: рука, пипетка, курсор
export const useTools = (params: UseToolsParams = {}) => {
  const { canvasWidth = 0, canvasHeight = 0, onToolChange, externalActiveTool } = params
  const [activeTool, setActiveTool] = useState<ToolType>("none")
  const [pipetteState, setPipetteState] = useState<PipetteState>({
    primaryColor: null,
    secondaryColor: null,
    isActive: false,
  })
  const [handState, setHandState] = useState<HandState>({
    isActive: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  })

  // Синхронизация с внешним состоянием инструмента
  useEffect(() => {
    if (externalActiveTool !== undefined) {
      setActiveTool(externalActiveTool)
    }
  }, [externalActiveTool])

  // Переключение инструмента с сбросом состояний
  const setTool = useCallback(
    (tool: ToolType) => {
      setActiveTool(tool)
      onToolChange?.(tool)

      if (tool !== "pipette") {
        setPipetteState((prev) => ({ ...prev, isActive: false }))
      }
      if (tool !== "hand") {
        setHandState((prev) => ({ ...prev, isActive: false, isDragging: false }))
      }
    },
    [onToolChange]
  )

  // Пипетка: пиксель берётся из исходного изображения (координаты уже пересчитаны в пиксели документа)
  const handlePipetteClick = useCallback(
    (event: MouseEvent, pixel: PickedPixel) => {
      if (activeTool !== "pipette") return

      const colorInfo: ColorInfo = { ...getColorInfo(pixel.r, pixel.g, pixel.b, pixel.x, pixel.y), a: pixel.a }
      // Alt/Ctrl/Shift + клик — дополнительный цвет
      const isSecondary = event.altKey || event.ctrlKey || event.shiftKey

      setPipetteState((prev) =>
        isSecondary
          ? { ...prev, secondaryColor: colorInfo, isActive: true }
          : { ...prev, primaryColor: colorInfo, isActive: true }
      )
    },
    [activeTool]
  )

  // Начало перетаскивания инструментом рука
  const handleHandMouseDown = useCallback(
    (event: MouseEvent) => {
      if (activeTool !== "hand") return

      setHandState((prev) => ({
        ...prev,
        isDragging: true,
        startX: event.clientX,
        startY: event.clientY,
        isActive: true,
      }))
    },
    [activeTool]
  )

  const handleHandMouseMove = useCallback(
    (event: MouseEvent, canvasWidth: number, canvasHeight: number, viewportWidth: number, viewportHeight: number) => {
      if (activeTool !== "hand" || !handState.isDragging) return

      const deltaX = event.clientX - handState.startX
      const deltaY = event.clientY - handState.startY

      setHandState((prev) => {
        const newOffsetX = prev.offsetX + deltaX
        const newOffsetY = prev.offsetY + deltaY

        return {
          ...prev,
          offsetX: clampPan(newOffsetX, canvasWidth, viewportWidth),
          offsetY: clampPan(newOffsetY, canvasHeight, viewportHeight),
          startX: event.clientX,
          startY: event.clientY,
        }
      })
    },
    [activeTool, handState.isDragging, handState.startX, handState.startY]
  )

  const handleHandMouseUp = useCallback(() => {
    if (activeTool !== "hand") return

    setHandState((prev) => ({
      ...prev,
      isDragging: false,
    }))
  }, [activeTool])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Не перехватываем клавиши, пока пользователь печатает в полях или работает с диалогом
      if (isTypingTarget(event.target)) return
      // Сочетания с Ctrl/Alt/Meta обрабатываются отдельно (открыть, сохранить и т.д.)
      if (event.ctrlKey || event.metaKey || event.altKey) return

      // event.code не зависит от раскладки: KeyH сработает и для «р»
      if (event.code === "KeyH") {
        event.preventDefault()
        setTool("hand")
      } else if (event.code === "KeyI") {
        event.preventDefault()
        setTool("pipette")
      } else if (event.code === "KeyL") {
        event.preventDefault()
        setTool("layers")
      } else if (event.code === "KeyC") {
        event.preventDefault()
        setTool("channels")
      } else if (event.key === "Escape") {
        event.preventDefault()
        setTool("none")
      } else if (activeTool === "hand" && event.key.startsWith("Arrow")) {
        // Стрелки двигают изображение рукой с шагом 10 px
        const step = 10
        const dx = event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0
        const dy = event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0
        if (!dx && !dy) return
        event.preventDefault()
        setHandState((prev) => ({
          ...prev,
          isActive: true,
          offsetX: clampPan(prev.offsetX + dx, canvasWidth, window.innerWidth),
          offsetY: clampPan(prev.offsetY + dy, canvasHeight, window.innerHeight),
        }))
      }
    },
    [activeTool, setTool, canvasWidth, canvasHeight]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    // pointerup — мышь, палец и перо
    document.addEventListener("pointerup", handleHandMouseUp)
    document.addEventListener("pointercancel", handleHandMouseUp)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerup", handleHandMouseUp)
      document.removeEventListener("pointercancel", handleHandMouseUp)
    }
  }, [handleKeyDown, handleHandMouseUp])

  return {
    activeTool,
    pipetteState,
    handState,
    setTool,
    handlePipetteClick,
    handleHandMouseDown,
    handleHandMouseMove,
    setHandState,
  }
}
