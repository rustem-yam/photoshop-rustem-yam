import React from "react"
import "./StatusBar.scss"
import { Typography, Slider, Box } from "@mui/material"

interface StatusBarProps {
  width: number
  height: number
  depth: number
  scale: number
  onScaleChange: (v: number) => void
}

const StatusBar: React.FC<StatusBarProps> = ({ width, height, depth, scale, onScaleChange }) => {
  return (
    <div className="status-bar">
      <Typography variant="body2" sx={{ flexGrow: 1 }}>
        Ширина: {width}px | Высота: {height}px | Глубина: {depth}-bit
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="body2">Масштаб: {scale}%</Typography>
        <Slider
          value={scale}
          size="small"
          onChange={(_, v) => onScaleChange(v as number)}
          min={10}
          max={300}
          sx={{ width: 120 }}
        />
      </Box>
    </div>
  )
}

export default StatusBar
