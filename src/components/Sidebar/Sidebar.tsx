import React from "react"
import "./Sidebar.scss"
import { IconButton, Tooltip, Divider } from "@mui/material"
import { ZoomIn, PanTool, Colorize } from "@mui/icons-material"
import { TOOLS } from "@/types/tools"
import type { ToolType } from "@/types/tools"

interface SidebarProps {
  hasImage: boolean
  activeTool: ToolType
  onToolSelect: (tool: ToolType) => void
}

const Sidebar: React.FC<SidebarProps> = ({ hasImage, activeTool, onToolSelect }) => {
  const openScale = () => {
    if (!hasImage) return
    window.dispatchEvent(new CustomEvent("open-scale-modal"))
  }

  const handleToolClick = (tool: ToolType) => {
    if (!hasImage && tool !== "none") return
    onToolSelect(tool)
  }

  return (
    <div className="sidebar">
      <div className="tool-section">
        <Tooltip title={`${TOOLS.hand.name} (${TOOLS.hand.hotkey})`} placement="right">
          <IconButton
            className={`tool-button ${activeTool === "hand" ? "active" : ""} ${!hasImage ? "disabled" : ""}`}
            onClick={() => handleToolClick("hand")}
            disabled={!hasImage}
          >
            <PanTool />
          </IconButton>
        </Tooltip>

        <Tooltip title={`${TOOLS.pipette.name} (${TOOLS.pipette.hotkey})`} placement="right">
          <IconButton
            className={`tool-button ${activeTool === "pipette" ? "active" : ""} ${!hasImage ? "disabled" : ""}`}
            onClick={() => handleToolClick("pipette")}
            disabled={!hasImage}
          >
            <Colorize />
          </IconButton>
        </Tooltip>
      </div>

      <Divider className="sidebar-divider" />

      <div className="action-section">
        <Tooltip title="Изменить размер изображения" placement="right">
          <IconButton
            className={`action-button ${!hasImage ? "disabled" : ""}`}
            onClick={openScale}
            disabled={!hasImage}
          >
            <ZoomIn />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  )
}

export default Sidebar
