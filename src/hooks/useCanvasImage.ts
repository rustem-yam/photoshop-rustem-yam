import { useRef, useState, useCallback } from "react"
import { getImageDepth, isGB7File, convertGB7ToDataURL } from "@/utils/imageUtils"
import { renderLayersToCanvas } from "@/utils/layerUtils"
import type { Layer } from "@/types/layers"

// Хук для управления canvas и изображениями
export const useCanvasImage = () => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sizerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const originalImageRef = useRef<HTMLImageElement | null>(null)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0, depth: 0 })
  const [isTransparent, setIsTransparent] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Отрисовка изображения на canvas с заданным масштабом
  const renderCanvas = useCallback(
    (scale = 100) => {
      const canvas = canvasRef.current
      const sizer = sizerRef.current
      const img = originalImageRef.current
      if (!canvas || !sizer || !img) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const scaledW = Math.round(img.naturalWidth * (scale / 100))
      const scaledH = Math.round(img.naturalHeight * (scale / 100))

      canvas.width = scaledW
      canvas.height = scaledH

      setCanvasSize({ width: scaledW, height: scaledH })

      if (isTransparent) {
        const block = 7
        for (let y = 0; y < scaledH; y += block) {
          for (let x = 0; x < scaledW; x += block) {
            ctx.fillStyle = (Math.floor(x / block) + Math.floor(y / block)) % 2 === 0 ? "#fff" : "#ccc"
            ctx.fillRect(x, y, block, block)
          }
        }
      } else {
        ctx.fillStyle = "#262626"
        ctx.fillRect(0, 0, scaledW, scaledH)
      }

      ctx.drawImage(img, 0, 0, scaledW, scaledH)

      sizer.style.width = `${scaledW}px`
      sizer.style.height = `${scaledH}px`
    },
    [isTransparent]
  )

  // Отрисовка слоев на canvas
  const renderLayers = useCallback(
    (layers: Layer[], scale = 100) => {
      const canvas = canvasRef.current
      const sizer = sizerRef.current
      if (!canvas || !sizer) return

      // If there are no layers - clear canvas and reset size
      if (!layers || layers.length === 0) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0)
        }
        setCanvasSize({ width: 0, height: 0 })
        sizer.style.width = `0px`
        sizer.style.height = `0px`
        return
      }

      // Находим максимальные размеры среди всех слоев
      let maxWidth = 0
      let maxHeight = 0

      for (const layer of layers) {
        if (layer.imageData) {
          maxWidth = Math.max(maxWidth, layer.imageData.width)
          maxHeight = Math.max(maxHeight, layer.imageData.height)
        }
      }

      if (maxWidth === 0 || maxHeight === 0) return

      const scaledW = Math.round(maxWidth * (scale / 100))
      const scaledH = Math.round(maxHeight * (scale / 100))

      canvas.width = scaledW
      canvas.height = scaledH

      setCanvasSize({ width: scaledW, height: scaledH })

      // Отрисовываем слои
      renderLayersToCanvas(canvas, layers, scale, isTransparent)

      sizer.style.width = `${scaledW}px`
      sizer.style.height = `${scaledH}px`
    },
    [isTransparent]
  )

  // Загрузка и обработка файлов изображений
  const handleFileUpload = async (file: File) => {
    if (isGB7File(file)) {
      try {
        const dataUrl = await convertGB7ToDataURL(file)
        const depth = await getImageDepth(file)

        const img = new Image()
        img.onload = () => {
          setImageInfo({ width: img.width, height: img.height, depth })
          setImageSrc(img.src)
          setIsTransparent(true) // .gb7 файлы могут иметь прозрачность
          originalImageRef.current = img
          renderCanvas(100)
        }
        img.src = dataUrl
      } catch (error) {
        console.error("Ошибка при загрузке .gb7 файла:", error)
        return
      }
    } else {
      const img = new Image()
      img.onload = async () => {
        const depth = await getImageDepth(file)
        setImageInfo({ width: img.width, height: img.height, depth })
        setImageSrc(img.src)

        const ext = file.name.split(".").pop()?.toLowerCase()
        setIsTransparent(ext === "png")

        originalImageRef.current = img
        renderCanvas(100)
      }
      img.src = URL.createObjectURL(file)
    }
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

    renderCanvas(100)
  }

  return {
    canvasRef,
    wrapperRef,
    sizerRef,
    imageSrc,
    imageInfo,
    isTransparent,
    canvasSize,
    handleFileUpload,
    originalImageRef,
    setImageFromDataUrl,
    renderCanvas,
    renderLayers,
  }
}
