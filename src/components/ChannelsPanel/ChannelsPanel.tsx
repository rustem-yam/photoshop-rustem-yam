import React, { useMemo } from "react"
import { Box, Typography } from "@mui/material"
import { analyzeRaster, channelToGray, thumbnail, type ChannelId } from "@/utils/channels"
import { toImageData, type Raster } from "@/utils/raster"
import "./ChannelsPanel.scss"

interface ChannelsPanelProps {
  image: Raster | null
}

interface ChannelRow {
  id: ChannelId | "rgb"
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

const ChannelsPanel: React.FC<ChannelsPanelProps> = ({ image }) => {
  const analysis = useMemo(() => (image ? analyzeRaster(image) : null), [image])

  const rows = useMemo<ChannelRow[]>(() => {
    if (!image || !analysis) return []
    const small = thumbnail(image, THUMB_SIZE)
    const result: ChannelRow[] = analysis.isGray
      ? [{ id: "r", name: "Серый", preview: rasterToDataUrl(channelToGray(small, "r")) }]
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

  return (
    <Box className="channels-panel">
      <Typography variant="body2" className="channels-mode">
        Режим: {analysis.isGray ? "оттенки серого" : "RGB"}
        {analysis.hasAlpha ? " + прозрачность" : ""}
      </Typography>

      <ul className="channels-list">
        {rows.map((row) => (
          <li key={row.id} className="channel-row">
            <img className="channel-thumb" src={row.preview} alt={row.name} />
            <span className="channel-name">{row.name}</span>
          </li>
        ))}
      </ul>
    </Box>
  )
}

export default ChannelsPanel
