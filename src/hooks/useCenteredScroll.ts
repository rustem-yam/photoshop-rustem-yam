import { useEffect } from "react"

// Центрирует прокрутку контейнера при изменении key (новое изображение, масштаб)
export const useCenteredScroll = (wrapperRef: React.RefObject<HTMLElement | null>, key: unknown) => {
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
  }, [wrapperRef, key])
}
