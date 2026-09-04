import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import StatusBar from "@/components/StatusBar/StatusBar"
import { AddBox, CloudUpload } from "@mui/icons-material"
import { IconButton, Tooltip, Typography, Snackbar, Alert } from "@mui/material"
import { useCenteredScroll } from "@/hooks/useCenteredScroll"
import { useTools } from "@/hooks/useTools"
import { useImageDocument } from "@/hooks/useImageDocument"
import ScaleModal from "@/components/ScaleModal/ScaleModal"
import InfoPanel from "@/components/InfoPanel/InfoPanel"
import { ColorInfoDisplay, ContrastInfo } from "@/components/ColorInfo/ColorInfo"
import LayersPanel from "@/components/LayersPanel/LayersPanel"
import { isGB7File } from "@/utils/imageUtils"
import { compositeLayers } from "@/utils/compositing"
import { toImageData } from "@/utils/raster"
import type { PickedPixel, ToolType } from "@/types/tools"
import "./CanvasArea.scss"

interface CanvasAreaProps {
  onImageChange: (hasImage: boolean) => void
  onToolChange: (tool: ToolType) => void
  activeTool: ToolType
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ onImageChange, onToolChange, activeTool: externalActiveTool }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { layersState, setLayersState, info, size, version, hasImage, openFile, resizeDocument } = useImageDocument()

  const [isDragging, setIsDragging] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [scale, setScale] = useState(100)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [layersPanelOpen, setLayersPanelOpen] = useState(false)

  const scaledW = Math.max(1, Math.round((size.width * scale) / 100))
  const scaledH = Math.max(1, Math.round((size.height * scale) / 100))

  const { activeTool, pipetteState, handState, handlePipetteClick, handleHandMouseDown, handleHandMouseMove } =
    useTools({
      canvasWidth: scaledW,
      canvasHeight: scaledH,
      onToolChange,
      externalActiveTool,
    })

  // Сведённое изображение всех видимых слоёв в полном разрешении
  const composite = useMemo(
    () => (layersState.layers.length > 0 ? compositeLayers(layersState.layers) : null),
    [layersState.layers]
  )

  useEffect(() => {
    onImageChange(hasImage)
  }, [hasImage, onImageChange])

  useCenteredScroll(wrapperRef, `${version}|${scale}`)

  // Новый файл — масштаб 100%
  useEffect(() => {
    setScale(100)
  }, [version])

  // Вывод на холст: холст в размер документа, масштаб просмотра — через CSS
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !composite) return
    canvas.width = composite.width
    canvas.height = composite.height
    canvas.getContext("2d")?.putImageData(toImageData(composite), 0, 0)
  }, [composite])

  useEffect(() => {
    const onOpen = () => setModalOpen(true)
    window.addEventListener("open-scale-modal", onOpen as EventListener)
    return () => window.removeEventListener("open-scale-modal", onOpen as EventListener)
  }, [])

  useEffect(() => {
    if (activeTool === "pipette") {
      setInfoPanelOpen(true)
      setLayersPanelOpen(false)
    } else if (activeTool === "layers") {
      // Всегда разворачиваем панель слоев при активации инструмента "Слои"
      setLayersPanelOpen(true)
      setInfoPanelOpen(false)
    } else {
      setInfoPanelOpen(false)
      setLayersPanelOpen(false)
    }
  }, [activeTool])

  // Пиксель документа под курсором (с учётом масштаба и сдвига рукой)
  const pickPixel = useCallback(
    (event: MouseEvent): PickedPixel | null => {
      const canvas = canvasRef.current
      if (!canvas || !composite) return null
      const rect = canvas.getBoundingClientRect()
      const x = Math.floor(((event.clientX - rect.left) / rect.width) * composite.width)
      const y = Math.floor(((event.clientY - rect.top) / rect.height) * composite.height)
      if (x < 0 || y < 0 || x >= composite.width || y >= composite.height) return null
      const i = (y * composite.width + x) * 4
      const d = composite.data
      return { x, y, r: d[i], g: d[i + 1], b: d[i + 2], a: d[i + 3] }
    },
    [composite]
  )

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "pipette") return
    const pixel = pickPixel(e.nativeEvent)
    if (pixel) handlePipetteClick(e.nativeEvent, pixel)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "hand") handleHandMouseDown(e.nativeEvent)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "hand") {
      handleHandMouseMove(e.nativeEvent, scaledW, scaledH, window.innerWidth, window.innerHeight)
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/") && !isGB7File(file)) {
      setAlertMessage("Поддерживаются только изображения!")
      return
    }
    try {
      await openFile(file)
    } catch (error) {
      console.error("Ошибка при открытии файла:", error)
      setAlertMessage(`Не удалось открыть файл: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const sizerTransform =
    activeTool === "hand" && handState.isActive ? `translate(${handState.offsetX}px, ${handState.offsetY}px)` : undefined

  return (
    <div
      className={`main ${isDragging ? "dragging" : ""} tool-${activeTool}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFile(e.dataTransfer.files?.[0])
      }}
    >
      {!hasImage && (
        <label className="upload-button">
          <Typography variant="h6">Загрузите или перетащите изображение</Typography>
          <Tooltip title="Поддерживаемые форматы: png, jpg, jpeg, gb7">
            <IconButton color="primary" component="span" className="upload-icon">
              {isDragging ? (
                <CloudUpload sx={{ fontSize: 100, color: "#4caf50" }} />
              ) : (
                <AddBox sx={{ fontSize: 100 }} />
              )}
            </IconButton>
          </Tooltip>
          <input
            type="file"
            accept="image/*,.gb7"
            style={{ display: "none" }}
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </label>
      )}

      {hasImage && (
        <div className="canvas-wrapper" ref={wrapperRef}>
          <div className="canvas-sizer" style={{ width: scaledW, height: scaledH, transform: sizerTransform }}>
            <canvas
              ref={canvasRef}
              className={scale >= 100 ? "pixelated" : undefined}
              style={{ width: scaledW, height: scaledH }}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
            ></canvas>
          </div>
        </div>
      )}

      {hasImage && (
        <StatusBar
          width={size.width}
          height={size.height}
          depth={info?.depth ?? 0}
          scale={scale}
          onScaleChange={setScale}
        />
      )}

      <ScaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sourceSize={size}
        onConfirm={(w, h, method) => resizeDocument(w, h, method)}
      />

      <InfoPanel isOpen={infoPanelOpen} onToggle={() => setInfoPanelOpen(!infoPanelOpen)} title="Информация о цвете">
        <ColorInfoDisplay color={pipetteState.primaryColor} label="Основной цвет" />
        <ColorInfoDisplay color={pipetteState.secondaryColor} label="Дополнительный цвет" />
        <ContrastInfo color1={pipetteState.primaryColor} color2={pipetteState.secondaryColor} />
      </InfoPanel>

      <InfoPanel
        isOpen={layersPanelOpen}
        onToggle={() => setLayersPanelOpen(!layersPanelOpen)}
        title="Слои и альфа-каналы"
      >
        <LayersPanel layersState={layersState} onLayersStateChange={setLayersState} imageSize={size} />
      </InfoPanel>

      <Snackbar
        open={alertMessage !== null}
        autoHideDuration={4000}
        onClose={() => setAlertMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" sx={{ width: "100%" }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default CanvasArea
