import React, { useEffect, useState, useCallback, type Dispatch } from "react"
import StatusBar from "@/components/StatusBar/StatusBar"
import { AddBox, CloudUpload } from "@mui/icons-material"
import { IconButton, Tooltip, Typography, Snackbar, Alert } from "@mui/material"
import { useCanvasImage } from "@/hooks/useCanvasImage"
import { useCenteredScroll } from "@/hooks/useCenteredScroll"
import { useTools } from "@/hooks/useTools"
import { useLayers } from "@/hooks/useLayers"
import ScaleModal from "@/components/ScaleModal/ScaleModal"
import InfoPanel from "@/components/InfoPanel/InfoPanel"
import { ColorInfoDisplay, ContrastInfo } from "@/components/ColorInfo/ColorInfo"
import LayersPanel from "@/components/LayersPanel/LayersPanel"
import { isGB7File } from "@/utils/imageUtils"
import { createLayerFromImage } from "@/utils/layerUtils"
import type { ToolType } from "@/types/tools"
import "./CanvasArea.scss"

interface CanvasAreaProps {
  onImageChange: Dispatch<React.SetStateAction<boolean>>
  onToolChange: (tool: ToolType) => void
  activeTool: ToolType
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ onImageChange, onToolChange, activeTool: externalActiveTool }) => {
  const {
    canvasRef,
    wrapperRef,
    sizerRef,
    imageSrc,
    imageInfo,
    canvasSize,
    handleFileUpload,
    renderCanvas,
    renderLayers,
    originalImageRef,
    setImageFromDataUrl,
  } = useCanvasImage()

  const { activeTool, pipetteState, handState, handlePipetteClick, handleHandMouseDown, handleHandMouseMove } =
    useTools({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      onToolChange,
      externalActiveTool,
    })

  const [isDragging, setIsDragging] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [scale, setScale] = useState(100)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [layersPanelOpen, setLayersPanelOpen] = useState(false)

  const { layersState, setLayersState, addLayer } = useLayers()

  const updateCanvas = useCallback(() => {
    if (layersState.layers.length > 0) {
      renderLayers(layersState.layers, scale)
    }
  }, [layersState.layers, scale, renderLayers])

  useCenteredScroll(wrapperRef, [imageSrc, scale])

  useEffect(() => {
    if (!imageSrc) return
    renderCanvas(100)
    setScale(100)
  }, [imageSrc, renderCanvas])

  useEffect(() => {
    if (!imageSrc) return
    renderCanvas(scale)
  }, [scale, imageSrc, renderCanvas])

  // Отрисовка слоев при изменении слоев или масштаба
  useEffect(() => {
    if (layersState.layers.length > 0) {
      renderLayers(layersState.layers, scale)
    }
  }, [layersState.layers, scale, renderLayers])

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageSrc) return

    const handleMouseDown = (e: MouseEvent) => {
      if (activeTool === "hand") {
        handleHandMouseDown(e)
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (activeTool === "pipette") {
        handlePipetteClick(canvas, e, scale / 100)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (activeTool === "hand") {
        const canvasWidth = canvas.width
        const canvasHeight = canvas.height
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        handleHandMouseMove(e, canvasWidth, canvasHeight, viewportWidth, viewportHeight)
      }
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("click", handleClick)
    canvas.addEventListener("mousemove", handleMouseMove)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("click", handleClick)
      canvas.removeEventListener("mousemove", handleMouseMove)
    }
  }, [activeTool, imageSrc, scale, handlePipetteClick, handleHandMouseDown, handleHandMouseMove])

  useEffect(() => {
    const sizer = sizerRef.current
    if (!sizer) return

    if (activeTool === "hand" && handState.isActive) {
      sizer.style.transform = `translate(${handState.offsetX}px, ${handState.offsetY}px)`
    } else {
      sizer.style.transform = "translate(0px, 0px)"
    }
  }, [activeTool, handState.offsetX, handState.offsetY, handState.isActive])

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/") && !isGB7File(file)) {
      setAlertOpen(true)
      return
    }

    // Если это первое изображение и нет слоев, создаем "Слой 1"
    if (layersState.layers.length === 0) {
      try {
        const layer = await createLayerFromImage(file, "Слой 1")
        addLayer(layer)
      } catch (error) {
        console.error("Ошибка при создании слоя:", error)
      }
    }

    handleFileUpload(file)
    onImageChange(true)
  }

  const handleModalConfirm = async (dataUrl: string, width: number, height: number) => {
    await setImageFromDataUrl(dataUrl, width, height)
    setScale(100)
  }

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
      {!imageSrc && (
        <label className="upload-button">
          <Typography variant="h6">Загрузите или перетащите изображение</Typography>
          <Tooltip title="Поддерживаемые форматы: jpeg, png, gif, svg, gb7">
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
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}

      {imageSrc && (
        <div className="canvas-wrapper" ref={wrapperRef}>
          <div className="canvas-sizer" ref={sizerRef}>
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>
      )}

      {imageSrc && (
        <StatusBar
          width={imageInfo.width}
          height={imageInfo.height}
          depth={imageInfo.depth}
          scale={scale}
          onScaleChange={setScale}
        />
      )}

      <ScaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        originalImage={originalImageRef.current}
        onConfirm={handleModalConfirm}
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
        <LayersPanel
          layersState={layersState}
          onLayersStateChange={setLayersState}
          onCanvasUpdate={updateCanvas}
          imageSize={imageInfo}
        />
      </InfoPanel>

      <Snackbar
        open={alertOpen}
        autoHideDuration={3000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" sx={{ width: "100%" }}>
          Поддерживаются только изображения!
        </Alert>
      </Snackbar>
    </div>
  )
}

export default CanvasArea
