import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import StatusBar from "@/components/StatusBar/StatusBar"
import { AddBox, CloudUpload } from "@mui/icons-material"
import { IconButton, Tooltip, Typography, Snackbar, Alert } from "@mui/material"
import { useCenteredScroll } from "@/hooks/useCenteredScroll"
import { useTools } from "@/hooks/useTools"
import { useImageDocument } from "@/hooks/useImageDocument"
import { useCommand, useCommandShortcuts } from "@/hooks/useCommand"
import ScaleModal from "@/components/ScaleModal/ScaleModal"
import SaveDialog from "@/components/SaveDialog/SaveDialog"
import LevelsDialog from "@/components/LevelsDialog/LevelsDialog"
import InfoPanel from "@/components/InfoPanel/InfoPanel"
import { ColorInfoDisplay, ContrastInfo } from "@/components/ColorInfo/ColorInfo"
import LayersPanel from "@/components/LayersPanel/LayersPanel"
import ChannelsPanel from "@/components/ChannelsPanel/ChannelsPanel"
import { isGB7File } from "@/utils/imageUtils"
import { compositeLayers } from "@/utils/compositing"
import { toImageData, type Raster } from "@/utils/raster"
import { fitScale } from "@/utils/zoom"
import {
  ALL_CHANNELS_VISIBLE,
  analyzeRaster,
  applyChannelVisibility,
  describeVisibility,
  isAllVisible,
  type ChannelVisibility,
} from "@/utils/channels"
import { baseName, downloadBlob, encodeImage, formatFromFileName, type SaveFormat } from "@/utils/exportImage"
import type { PickedPixel, ToolType } from "@/types/tools"
import "./CanvasArea.scss"

type PanelKind = "color" | "layers" | "channels"

const TOOL_PANELS: Partial<Record<ToolType, PanelKind>> = {
  pipette: "color",
  layers: "layers",
  channels: "channels",
}

const PANEL_TITLES: Record<PanelKind, string> = {
  color: "Информация о цвете",
  layers: "Слои и альфа-каналы",
  channels: "Каналы",
}

interface CanvasAreaProps {
  onImageChange: (hasImage: boolean) => void
  onToolChange: (tool: ToolType) => void
  activeTool: ToolType
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ onImageChange, onToolChange, activeTool: externalActiveTool }) => {
  const mainRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    layersState,
    setLayersState,
    info,
    size,
    version,
    hasImage,
    activeLayer,
    openFile,
    replaceLayerImage,
    resizeDocument,
  } = useImageDocument()

  const [isDragging, setIsDragging] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [levelsOpen, setLevelsOpen] = useState(false)
  // Предпросмотр уровней/фильтров: временные пиксели для одного слоя, документ не меняется
  const [preview, setPreview] = useState<{ layerId: string; raster: Raster } | null>(null)
  const [scale, setScale] = useState(100)
  // Правая панель: содержимое зависит от последнего инструмента с панелью
  const [panelKind, setPanelKind] = useState<PanelKind>("color")
  const [panelOpen, setPanelOpen] = useState(false)
  const [channels, setChannels] = useState<ChannelVisibility>(ALL_CHANNELS_VISIBLE)
  const [colorizeChannels, setColorizeChannels] = useState(false)

  const scaledW = Math.max(1, Math.round((size.width * scale) / 100))
  const scaledH = Math.max(1, Math.round((size.height * scale) / 100))

  const { activeTool, pipetteState, handState, handlePipetteClick, handleHandMouseDown, handleHandMouseMove } =
    useTools({
      canvasWidth: scaledW,
      canvasHeight: scaledH,
      onToolChange,
      externalActiveTool,
    })

  // Сведённое изображение всех видимых слоёв в полном разрешении (с учётом предпросмотра)
  const composite = useMemo(() => {
    const { layers } = layersState
    if (layers.length === 0) return null
    const viewLayers = preview
      ? layers.map((l) => (l.id === preview.layerId ? { ...l, imageData: preview.raster } : l))
      : layers
    return compositeLayers(viewLayers)
  }, [layersState, preview])

  const activeLayerId = activeLayer?.id
  const handlePreview = useCallback(
    (raster: Raster | null) => setPreview(raster && activeLayerId ? { layerId: activeLayerId, raster } : null),
    [activeLayerId]
  )

  // Применение результата уровней/фильтров к активному слою
  const applyToActiveLayer = useCallback(
    (raster: Raster) => {
      if (activeLayerId) replaceLayerImage(activeLayerId, toImageData(raster))
      setPreview(null)
    },
    [activeLayerId, replaceLayerImage]
  )

  // Режим изображения (RGB / оттенки серого, есть ли прозрачность)
  const analysis = useMemo(() => (composite ? analyzeRaster(composite) : null), [composite])

  // То, что выводится на экран: сведённое изображение с учётом включённых каналов
  const displayImage = useMemo(
    () =>
      composite && analysis
        ? applyChannelVisibility(composite, channels, { isGray: analysis.isGray, colorize: colorizeChannels })
        : null,
    [composite, analysis, channels, colorizeChannels]
  )

  useEffect(() => {
    onImageChange(hasImage)
  }, [hasImage, onImageChange])

  useCenteredScroll(wrapperRef, `${version}|${scale}`)

  // Масштаб «вписать в окно» для текущей области просмотра
  const getFitScale = useCallback(() => {
    const area = wrapperRef.current ?? mainRef.current
    if (!area) return 100
    const statusBarHeight = wrapperRef.current ? 0 : 48
    return fitScale(size, { width: area.clientWidth - 32, height: area.clientHeight - statusBarHeight - 32 })
  }, [size])

  // Новый файл — вписываем в окно (крупные изображения уменьшаются, мелкие остаются 100%)
  const fittedVersion = useRef(0)
  useEffect(() => {
    if (version === fittedVersion.current) return
    fittedVersion.current = version
    setScale(getFitScale())
    setChannels(ALL_CHANNELS_VISIBLE)
  }, [version, getFitScale])

  // Вывод на холст: холст в размер документа, масштаб просмотра — через CSS
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !displayImage) return
    canvas.width = displayImage.width
    canvas.height = displayImage.height
    canvas.getContext("2d")?.putImageData(toImageData(displayImage), 0, 0)
  }, [displayImage])

  useCommandShortcuts()
  useCommand("open-file", () => fileInputRef.current?.click())
  useCommand("open-scale-modal", () => hasImage && setModalOpen(true))
  useCommand("save-file", () => hasImage && setSaveOpen(true))
  useCommand("open-levels", () => hasImage && setLevelsOpen(true))

  const handleSave = async (name: string, format: SaveFormat, quality: number) => {
    if (!composite) return
    const blob = await encodeImage(composite, format, quality)
    downloadBlob(blob, `${name}.${format}`)
  }

  // При выборе пипетки, слоёв или каналов разворачиваем соответствующую панель
  useEffect(() => {
    const kind = TOOL_PANELS[activeTool]
    if (kind) setPanelKind(kind)
    setPanelOpen(kind !== undefined)
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
      ref={mainRef}
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
      <input
        ref={fileInputRef}
        id="file-input"
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg,.gb7,image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />

      {!hasImage && (
        <label className="upload-button" htmlFor="file-input">
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
          note={
            analysis && !isAllVisible(channels, analysis.isGray)
              ? `Каналы: ${describeVisibility(channels, analysis.isGray)}`
              : undefined
          }
          scale={scale}
          onScaleChange={setScale}
          onFit={() => setScale(getFitScale())}
        />
      )}

      <ScaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sourceSize={size}
        onConfirm={(w, h, method) => resizeDocument(w, h, method)}
      />

      <LevelsDialog
        open={levelsOpen}
        layerName={activeLayer?.name ?? ""}
        source={activeLayer?.imageData ?? null}
        onPreview={handlePreview}
        onApply={(raster) => {
          applyToActiveLayer(raster)
          setLevelsOpen(false)
        }}
        onClose={() => setLevelsOpen(false)}
      />

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        defaultName={baseName(info?.fileName ?? "image")}
        defaultFormat={formatFromFileName(info?.fileName ?? "")}
        imageSize={size}
        onSave={handleSave}
      />

      <InfoPanel isOpen={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} title={PANEL_TITLES[panelKind]}>
        {panelKind === "color" && (
          <>
            <ColorInfoDisplay color={pipetteState.primaryColor} label="Основной цвет" />
            <ColorInfoDisplay color={pipetteState.secondaryColor} label="Дополнительный цвет" />
            <ContrastInfo color1={pipetteState.primaryColor} color2={pipetteState.secondaryColor} />
          </>
        )}
        {panelKind === "layers" && (
          <LayersPanel layersState={layersState} onLayersStateChange={setLayersState} imageSize={size} />
        )}
        {panelKind === "channels" && (
          <ChannelsPanel
            image={composite}
            analysis={analysis}
            visibility={channels}
            onVisibilityChange={setChannels}
            colorize={colorizeChannels}
            onColorizeChange={setColorizeChannels}
          />
        )}
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
