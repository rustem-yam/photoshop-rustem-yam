import React, { useEffect, useState } from "react"
import StatusBar from "@/components/StatusBar/StatusBar"
import { AddBox, CloudUpload } from "@mui/icons-material"
import { IconButton, Tooltip, Typography, Snackbar, Alert } from "@mui/material"
import { useCanvasImage } from "@/hooks/useCanvasImage"
import { useCenteredScroll } from "@/hooks/useCenteredScroll"
import "./CanvasArea.scss"

const CanvasArea: React.FC = () => {
  const { canvasRef, wrapperRef, sizerRef, imageSrc, imageInfo, isTransparent, handleFileUpload, drawImage } =
    useCanvasImage()
  const [isDragging, setIsDragging] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  useCenteredScroll(wrapperRef, canvasRef, [imageSrc, isTransparent])

  useEffect(() => {
    if (!imageSrc) return
    drawImage()
  }, [imageSrc, drawImage])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setAlertOpen(true)
      return
    }
    handleFileUpload(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setAlertOpen(true)
      return
    }
    handleFileUpload(file)
  }

  const handleAlertClose = () => setAlertOpen(false)

  return (
    <div
      className={`main ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!imageSrc && (
        <label className="upload-button">
          <Typography variant="h6">Загрузите или перетащите изображение</Typography>
          <Tooltip title="Поддерживаемые форматы: jpeg, png, gif, svg">
            <IconButton color="primary" component="span" className="upload-icon">
              {isDragging ? (
                <CloudUpload sx={{ fontSize: 100, color: "#4caf50" }} />
              ) : (
                <AddBox sx={{ fontSize: 100 }} />
              )}
            </IconButton>
          </Tooltip>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </label>
      )}

      {imageSrc && (
        <div className="canvas-wrapper" ref={wrapperRef}>
          <div className="canvas-sizer" ref={sizerRef}>
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>
      )}

      {imageSrc && <StatusBar width={imageInfo.width} height={imageInfo.height} depth={imageInfo.depth} />}

      <Snackbar
        open={alertOpen}
        autoHideDuration={3000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleAlertClose} severity="error" sx={{ width: "100%" }}>
          Поддерживаются только изображения!
        </Alert>
      </Snackbar>
    </div>
  )
}

export default CanvasArea
