import React, { useEffect, useState } from "react"
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
} from "@mui/material"
import { SAVE_FORMATS, type SaveFormat } from "@/utils/exportImage"

interface SaveDialogProps {
  open: boolean
  onClose: () => void
  defaultName: string
  defaultFormat: SaveFormat
  imageSize: { width: number; height: number }
  onSave: (name: string, format: SaveFormat, quality: number) => Promise<void>
}

const SaveDialog: React.FC<SaveDialogProps> = ({ open, onClose, defaultName, defaultFormat, imageSize, onSave }) => {
  const [name, setName] = useState(defaultName)
  const [format, setFormat] = useState<SaveFormat>(defaultFormat)
  const [quality, setQuality] = useState(92)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setFormat(defaultFormat)
      setError(null)
    }
  }, [open, defaultName, defaultFormat])

  const isJpeg = format === "jpg" || format === "jpeg"

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Введите имя файла")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(trimmed, format, quality / 100)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Сохранить изображение</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" gutterBottom>
          Размер: {imageSize.width} × {imageSize.height} px. Сохраняются все видимые слои.
        </Typography>

        <TextField
          fullWidth
          margin="dense"
          label="Имя файла"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">.{format}</InputAdornment> } }}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel id="save-format-label">Формат</InputLabel>
          <Select
            labelId="save-format-label"
            label="Формат"
            value={format}
            onChange={(e) => setFormat(e.target.value as SaveFormat)}
          >
            {(Object.keys(SAVE_FORMATS) as SaveFormat[]).map((f) => (
              <MenuItem key={f} value={f}>
                {SAVE_FORMATS[f].label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          {SAVE_FORMATS[format].hint}
        </Typography>

        {isJpeg && (
          <>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Качество: {quality}%
            </Typography>
            <Slider value={quality} min={10} max={100} onChange={(_, v) => setQuality(v as number)} />
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave} disabled={busy}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SaveDialog
