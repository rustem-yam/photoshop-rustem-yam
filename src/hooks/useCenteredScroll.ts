import { useEffect } from "react"

export const useCenteredScroll = (wrapperRef: React.RefObject<HTMLElement | null>, deps: any[] = []) => {
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const center = () => {
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
      wrapper.scrollTop = (wrapper.scrollHeight - wrapper.clientHeight) / 2
    }

    center()
    window.addEventListener("resize", center)
    return () => window.removeEventListener("resize", center)
  }, deps)
}
