import React, { useEffect, useRef } from "react"
import { histogramHeights, type HistogramScale } from "@/utils/histogram"

interface HistogramProps {
  counts: Uint32Array
  scale: HistogramScale
  color?: string
  height?: number
  // Входной диапазон [чёрная, белая точка]: уровни вне его затемняются
  range?: [number, number]
}

const WIDTH = 256

// Гистограмма: 256 столбцов, ширина канваса подгоняется под контейнер через CSS
const Histogram: React.FC<HistogramProps> = ({ counts, scale, color = "#ddd", height = 140, range }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    canvas.width = WIDTH
    canvas.height = height
    ctx.fillStyle = "#1e1e1e"
    ctx.fillRect(0, 0, WIDTH, height)

    const heights = histogramHeights(counts, scale)
    ctx.fillStyle = color
    for (let i = 0; i < WIDTH; i++) {
      const h = Math.round(heights[i] * (height - 4))
      if (h > 0) ctx.fillRect(i, height - h, 1, h)
    }

    if (range) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
      ctx.fillRect(0, 0, range[0], height)
      ctx.fillRect(range[1] + 1, 0, WIDTH - range[1] - 1, height)
    }
  }, [counts, scale, color, height, range])

  return (
    <canvas
      ref={canvasRef}
      className="histogram"
      style={{ width: "100%", height, display: "block", imageRendering: "pixelated", borderRadius: 4 }}
      aria-label="Гистограмма"
    />
  )
}

export default Histogram
