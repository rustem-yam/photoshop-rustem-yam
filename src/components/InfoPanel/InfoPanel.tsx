import React from "react"
import { Box, IconButton, Typography, Tooltip, Collapse, Paper } from "@mui/material"
import { ChevronLeft, ChevronRight } from "@mui/icons-material"
import "./InfoPanel.scss"

interface InfoPanelProps {
  children: React.ReactNode
  title?: string
  isOpen: boolean
  onToggle: () => void
}

const InfoPanel: React.FC<InfoPanelProps> = ({ children, title = "Информация", isOpen, onToggle }) => {
  return (
    <Box className={`info-panel ${isOpen ? "open" : "closed"}`}>
      <Paper
        elevation={2}
        className="info-panel-content"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderLeft: "2px solid #161616",
          backgroundColor: "#535353",
          "&.MuiPaper-root": {
            backgroundColor: "#535353",
            borderRadius: 0,
          },
        }}
      >
        <Box className={`info-panel-header ${isOpen ? "open" : "closed"}`}>
          <Tooltip title={isOpen ? "Свернуть панель" : "Развернуть панель"}>
            <IconButton onClick={onToggle} size="small" className="toggle-button">
              {isOpen ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
          <Typography variant="h6" className="info-panel-title">
            {title}
          </Typography>
        </Box>

        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <Box className="info-panel-body">{children}</Box>
        </Collapse>
      </Paper>
    </Box>
  )
}

export default InfoPanel
