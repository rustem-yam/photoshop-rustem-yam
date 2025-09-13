import React from "react"
import "./Sidebar.scss"
import { IconButton, Tooltip } from "@mui/material"
import { ZoomIn } from "@mui/icons-material"

interface SidebarProps {
  hasImage: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ hasImage }) => {
  const openScale = () => {
    if (!hasImage) return
    window.dispatchEvent(new CustomEvent("open-scale-modal"))
  }

  return (
    <div className="sidebar">
      <Tooltip title="Изменить размер изображения">
        <IconButton className={`icon-button ${!hasImage ? "disabled" : ""}`} onClick={openScale} disabled={!hasImage}>
          <ZoomIn />
        </IconButton>
      </Tooltip>
    </div>
  )
}

export default Sidebar
