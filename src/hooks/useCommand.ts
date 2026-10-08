import { useEffect, useRef } from "react"
import { isTypingTarget } from "@/hooks/useTools"

// Команды из сайдбара и горячих клавиш для области холста
export type AppCommand = "open-file" | "save-file" | "open-scale-modal" | "open-levels" | "open-filter"

export const sendCommand = (command: AppCommand) => {
  window.dispatchEvent(new CustomEvent(command))
}

export const useCommand = (command: AppCommand, handler: () => void) => {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const listener = () => handlerRef.current()
    window.addEventListener(command, listener)
    return () => window.removeEventListener(command, listener)
  }, [command])
}

// Сочетания Ctrl/Cmd + клавиша (по event.code — не зависит от раскладки)
const SHORTCUTS: Record<string, AppCommand> = {
  KeyO: "open-file",
  KeyS: "save-file",
  KeyL: "open-levels",
}

export const useCommandShortcuts = () => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
      if (isTypingTarget(event.target)) return
      const command = SHORTCUTS[event.code]
      if (!command) return
      event.preventDefault()
      sendCommand(command)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])
}
