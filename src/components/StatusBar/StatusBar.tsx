import React from "react"
import "./StatusBar.scss"
import { Typography } from "@mui/material"

interface StatusBarProps {
  width: number
  height: number
  depth: number
}

const StatusBar: React.FC<StatusBarProps> = ({ width, height, depth }) => {
  return (
    <div className="status-bar">
      <Typography variant="body2">
        Ширина: {width}px | Высота: {height}px | Глубина: {depth}-bit
      </Typography>
    </div>
  )
}

export default StatusBar
