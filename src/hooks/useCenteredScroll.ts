import { useEffect } from "react"

export const useCenteredScroll = (
  wrapperRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLElement | null>,
  deps: any[] = []
) => {
  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const centerView = () => {
      const wrapperRect = wrapper.getBoundingClientRect()
      const canvasRect = canvas.getBoundingClientRect()
      const offsetLeft = canvasRect.left - wrapperRect.left + wrapper.scrollLeft
      const offsetTop = canvasRect.top - wrapperRect.top + wrapper.scrollTop

      const targetLeft = Math.max(Math.round(offsetLeft + canvasRect.width / 2 - wrapper.clientWidth / 2), 0)
      const targetTop = Math.max(Math.round(offsetTop + canvasRect.height / 2 - wrapper.clientHeight / 2), 0)

      if (Math.abs(wrapper.scrollLeft - targetLeft) > 1) wrapper.scrollLeft = targetLeft
      if (Math.abs(wrapper.scrollTop - targetTop) > 1) wrapper.scrollTop = targetTop
    }

    requestAnimationFrame(centerView)

    const onResize = () => requestAnimationFrame(centerView)
    window.addEventListener("resize", onResize)

    return () => window.removeEventListener("resize", onResize)
  }, deps)
}
