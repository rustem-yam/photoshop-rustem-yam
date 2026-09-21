import React, { useMemo } from "react"
import { Box, Checkbox, FormControlLabel, IconButton, Tooltip, Typography } from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import {
  ALL_CHANNELS_VISIBLE,
  channelToGray,
  thumbnail,
  type ChannelId,
  type ChannelVisibility,
  type ImageAnalysis,
} from "@/utils/channels"
import { toImageData, type Raster } from "@/utils/raster"
import "./ChannelsPanel.scss"

interface ChannelsPanelProps {
  image: Raster | null
  analysis: ImageAnalysis | null
  visibility: ChannelVisibility
  onVisibilityChange: (visibility: ChannelVisibility) => void
  colorize: boolean
  onColorizeChange: (value: boolean) => void
}

type RowId = ChannelId | "rgb" | "gray"

interface ChannelRow {
  id: RowId
  name: string
  preview: string
}

const THUMB_SIZE = 96

const rasterToDataUrl = (raster: Raster): string => {
  const canvas = document.createElement("canvas")
  canvas.width = raster.width
  canvas.height = raster.height
  canvas.getContext("2d")?.putImageData(toImageData(raster), 0, 0)
  return canvas.toDataURL()
}

const ChannelsPanel: React.FC<ChannelsPanelProps> = ({
  image,
  analysis,
  visibility,
  onVisibilityChange,
  colorize,
  onColorizeChange,
}) => {
  const rows = useMemo<ChannelRow[]>(() => {
    if (!image || !analysis) return []
    const small = thumbnail(image, THUMB_SIZE)
    const result: ChannelRow[] = analysis.isGray
      ? [{ id: "gray", name: "Серый", preview: rasterToDataUrl(channelToGray(small, "r")) }]
      : [
          { id: "rgb", name: "RGB", preview: rasterToDataUrl(small) },
          { id: "r", name: "Красный", preview: rasterToDataUrl(channelToGray(small, "r")) },
          { id: "g", name: "Зелёный", preview: rasterToDataUrl(channelToGray(small, "g")) },
          { id: "b", name: "Синий", preview: rasterToDataUrl(channelToGray(small, "b")) },
        ]
    if (analysis.hasAlpha) {
      result.push({ id: "a", name: "Альфа", preview: rasterToDataUrl(channelToGray(small, "a")) })
    }
    return result
  }, [image, analysis])

  if (!image || !analysis) {
    return <Typography variant="body2">Нет изображения</Typography>
  }

  const isVisible = (id: RowId): boolean => {
    if (id === "rgb") return visibility.r && visibility.g && visibility.b
    if (id === "gray") return visibility.r
    return visibility[id]
  }

  // «Глаз»: включить/выключить канал
  const toggle = (id: RowId) => {
    if (id === "rgb") {
      const on = !isVisible("rgb")
      onVisibilityChange({ ...visibility, r: on, g: on, b: on })
    } else if (id === "gray") {
      const on = !visibility.r
      onVisibilityChange({ ...visibility, r: on, g: on, b: on })
    } else {
      onVisibilityChange({ ...visibility, [id]: !visibility[id] })
    }
  }

  // Клик по строке: показать только этот канал (RGB/Серый — все каналы)
  const solo = (id: RowId) => {
    if (id === "rgb" || id === "gray") onVisibilityChange(ALL_CHANNELS_VISIBLE)
    else if (id === "a") onVisibilityChange({ r: false, g: false, b: false, a: true })
    else onVisibilityChange({ r: id === "r", g: id === "g", b: id === "b", a: false })
  }

  return (
    <Box className="channels-panel">
      <Typography variant="body2" className="channels-mode">
        Режим: {analysis.isGray ? "оттенки серого" : "RGB"}
        {analysis.hasAlpha ? " + прозрачность" : ""}
      </Typography>

      <ul className="channels-list">
        {rows.map((row) => {
          const visible = isVisible(row.id)
          return (
            <li
              key={row.id}
              className={`channel-row ${visible ? "selected" : "hidden-channel"}`}
              onClick={() => solo(row.id)}
              title="Нажмите, чтобы показать только этот канал"
            >
              <Tooltip title={visible ? "Скрыть канал" : "Показать канал"}>
                <IconButton
                  size="small"
                  aria-label={`${visible ? "Скрыть" : "Показать"} канал ${row.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(row.id)
                  }}
                >
                  {visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                </IconButton>
              </Tooltip>
              <img className="channel-thumb" src={row.preview} alt={row.name} />
              <span className="channel-name">{row.name}</span>
            </li>
          )
        })}
      </ul>

      {!analysis.isGray && (
        <FormControlLabel
          control={<Checkbox size="small" checked={colorize} onChange={(e) => onColorizeChange(e.target.checked)} />}
          label="Показывать отдельный канал в его цвете"
        />
      )}

      <Typography variant="body2" className="channels-hint">
        Каналы влияют только на отображение: пипетка, уровни, фильтры и сохранение работают с исходным изображением.
      </Typography>
    </Box>
  )
}

export default ChannelsPanel
