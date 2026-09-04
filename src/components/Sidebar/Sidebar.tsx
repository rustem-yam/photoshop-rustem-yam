import React from "react"
import "./Sidebar.scss"
import { IconButton, Tooltip, Divider } from "@mui/material"
import { AspectRatio, PanTool, Colorize, Layers, FolderOpen } from "@mui/icons-material"
import { TOOLS } from "@/types/tools"
import type { ToolType } from "@/types/tools"
import { sendCommand, type AppCommand } from "@/hooks/useCommand"

interface SidebarProps {
  hasImage: boolean
  activeTool: ToolType
  onToolSelect: (tool: ToolType) => void
}

const TOOL_ICONS: Partial<Record<ToolType, React.ReactNode>> = {
  hand: <PanTool />,
  pipette: <Colorize />,
  layers: <Layers />,
}

const ACTIONS: { command: AppCommand; title: string; icon: React.ReactNode; needsImage: boolean }[] = [
  { command: "open-file", title: "Открыть изображение (Ctrl+O)", icon: <FolderOpen />, needsImage: false },
  { command: "open-scale-modal", title: "Изменить размер изображения", icon: <AspectRatio />, needsImage: true },
]

const Sidebar: React.FC<SidebarProps> = ({ hasImage, activeTool, onToolSelect }) => {
  const handleToolClick = (tool: ToolType) => {
    if (!hasImage && tool !== "none") return
    onToolSelect(tool)
  }

  return (
    <div className="sidebar">
      <div className="tool-section">
        {(Object.keys(TOOL_ICONS) as ToolType[]).map((tool) => (
          <Tooltip key={tool} title={`${TOOLS[tool].name} (${TOOLS[tool].hotkey})`} placement="right">
            <span>
              <IconButton
                className={`tool-button ${activeTool === tool ? "active" : ""} ${!hasImage ? "disabled" : ""}`}
                onClick={() => handleToolClick(tool)}
                disabled={!hasImage}
                aria-label={TOOLS[tool].name}
              >
                {TOOL_ICONS[tool]}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </div>

      <Divider className="sidebar-divider" />

      <div className="action-section">
        {ACTIONS.map(({ command, title, icon, needsImage }) => {
          const disabled = needsImage && !hasImage
          return (
            <Tooltip key={command} title={title} placement="right">
              <span>
                <IconButton
                  className={`action-button ${disabled ? "disabled" : ""}`}
                  onClick={() => sendCommand(command)}
                  disabled={disabled}
                  aria-label={title}
                >
                  {icon}
                </IconButton>
              </span>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

export default Sidebar
