import React from "react"
import { Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery } from "@mui/material"
import "./ToolDialog.scss"

interface ToolDialogProps {
  open: boolean
  title: string
  onClose: () => void
  actions: React.ReactNode
  children: React.ReactNode
  width?: number
}

// Немодальное окно инструмента (уровни, фильтры): не затемняет холст,
// чтобы был виден предпросмотр, и не блокирует масштаб и прокрутку
const ToolDialog: React.FC<ToolDialogProps> = ({ open, title, onClose, actions, children, width = 420 }) => {
  const isPhone = useMediaQuery("(max-width: 600px)")

  return (
    <Dialog
      open={open}
      onClose={onClose}
      hideBackdrop
      disableEnforceFocus
      disableScrollLock
      className={`tool-dialog ${isPhone ? "tool-dialog--sheet" : ""}`}
      slotProps={{ paper: { className: "tool-dialog__paper", style: isPhone ? undefined : { width } } }}
    >
      <DialogTitle className="tool-dialog__title">{title}</DialogTitle>
      <DialogContent dividers className="tool-dialog__content">
        {children}
      </DialogContent>
      <DialogActions className="tool-dialog__actions">{actions}</DialogActions>
    </Dialog>
  )
}

export default ToolDialog
