import { useRef, useState, useCallback } from "react"
import { getImageDepth } from "@/utils/imageUtils"

export const useCanvasImage = () => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sizerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const originalImageRef = useRef<HTMLImageElement | null>(null)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0, depth: 0 })
  const [isTransparent, setIsTransparent] = useState(false)

  const handleFileUpload = async (file: File) => {
    const img = new Image()
    img.onload = async () => {
      const depth = await getImageDepth(file)
      setImageInfo({ width: img.width, height: img.height, depth })
      setImageSrc(img.src)
      const ext = file.name.split(".").pop()?.toLowerCase()
      setIsTransparent(ext === "png")
      originalImageRef.current = img
    }
    img.src = URL.createObjectURL(file)
  }

  const setImageFromDataUrl = async (dataUrl: string, width?: number, height?: number) => {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = rej
      img.src = dataUrl
    })
    setImageSrc(img.src)
    setImageInfo({ width: width ?? img.width, height: height ?? img.height, depth: 24 })
    originalImageRef.current = img
    setIsTransparent(img.src.startsWith("data:image/png"))
  }

  const drawImage = useCallback(() => {
    const wrapper = wrapperRef.current
    const sizer = sizerRef.current
    const canvas = canvasRef.current
    if (!wrapper || !sizer || !canvas || !imageSrc) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      sizer.style.width = `${canvas.width + 100}px`
      sizer.style.height = `${canvas.height + 100}px`

      if (isTransparent) {
        const block = 7
        for (let y = 0; y < canvas.height; y += block) {
          for (let x = 0; x < canvas.width; x += block) {
            ctx.fillStyle = (Math.floor(x / block) + Math.floor(y / block)) % 2 === 0 ? "#fff" : "#ccc"
            ctx.fillRect(x, y, block, block)
          }
        }
      } else {
        ctx.fillStyle = "#262626"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)
    }
  }, [imageSrc, isTransparent])

  return {
    canvasRef,
    wrapperRef,
    sizerRef,
    imageSrc,
    imageInfo,
    isTransparent,
    handleFileUpload,
    drawImage,
    originalImageRef,
    setImageFromDataUrl,
  }
}
