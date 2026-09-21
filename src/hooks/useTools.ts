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

        const maxOffsetX = Math.max(0, canvasWidth - viewportWidth + 100) // 100px запас
        const maxOffsetY = Math.max(0, canvasHeight - viewportHeight + 100)
        const minOffsetX = Math.min(0, -canvasWidth + 100)
        const minOffsetY = Math.min(0, -canvasHeight + 100)

        return {
          ...prev,
          offsetX: Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX)),
          offsetY: Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY)),
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
      } else if (activeTool === "hand") {
        const moveStep = 10
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault()
            setHandState((prev) => {
              const newOffsetX = prev.offsetX + moveStep
              const effectiveCanvasWidth = canvasWidth || 0
              const maxOffsetLeft = effectiveCanvasWidth - 500
              return {
                ...prev,
                offsetX: Math.min(maxOffsetLeft, newOffsetX),
                isActive: true,
              }
            })
            break
          case "ArrowRight":
            event.preventDefault()
            setHandState((prev) => {
              const newOffsetX = prev.offsetX - moveStep
              const effectiveCanvasWidth = canvasWidth || 0
              const maxOffsetRight = effectiveCanvasWidth - 500
              return {
                ...prev,
                offsetX: Math.max(-maxOffsetRight, newOffsetX),
                isActive: true,
              }
            })
            break
          case "ArrowUp":
            event.preventDefault()
            setHandState((prev) => {
              const newOffsetY = prev.offsetY + moveStep
              const effectiveCanvasHeight = canvasHeight || 0
              const maxOffsetUp = effectiveCanvasHeight - 500
              return {
                ...prev,
                offsetY: Math.min(maxOffsetUp, newOffsetY),
                isActive: true,
              }
            })
            break
          case "ArrowDown":
            event.preventDefault()
            setHandState((prev) => {
              const newOffsetY = prev.offsetY - moveStep
              const effectiveCanvasHeight = canvasHeight || 0
              const maxOffsetDown = effectiveCanvasHeight - 500
              return {
                ...prev,
                offsetY: Math.max(-maxOffsetDown, newOffsetY),
                isActive: true,
              }
            })
            break
        }
      }
    },
    [activeTool, setTool, canvasWidth, canvasHeight]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mouseup", handleHandMouseUp)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mouseup", handleHandMouseUp)
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
