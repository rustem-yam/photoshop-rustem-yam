import React, { useMemo, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Typography,
  Tooltip,
  Alert,
  LinearProgress,
  useMediaQuery,
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"
import type { ProgressOptions, ResizeMethod } from "@/hooks/useImageDocument"
import { isCancelled } from "@/utils/imageTasks"

interface ScaleModalProps {
  open: boolean
  onClose: () => void
  sourceSize: { width: number; height: number }
  onConfirm: (width: number, height: number, method: ResizeMethod, options: ProgressOptions) => Promise<void>
}

interface ScaleFormData {
  mode: "percent" | "pixels"
  width: number
  height: number
  keepAspect: boolean
  method: ResizeMethod
}

const MAX_SIZE = 10000
const MAX_PERCENT = 1000

const interpolateOptions = [
  { value: "bilinear", label: "Билинейная", desc: "Плавный результат, лучше при увеличении/уменьшении" },
  { value: "nearest", label: "Ближайший сосед", desc: "Быстрее, может давать пиксельный вид" },
]

const DEFAULTS: ScaleFormData = { mode: "percent", width: 100, height: 100, keepAspect: true, method: "bilinear" }

const ScaleModal: React.FC<ScaleModalProps> = ({ open, onClose, sourceSize, onConfirm }) => {
  const origW = sourceSize.width
  const origH = sourceSize.height
  const aspect = useMemo(() => (origW && origH ? origW / origH : 1), [origW, origH])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isPhone = useMediaQuery("(max-width: 600px)")
  const [progress, setProgress] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const { control, watch, setValue, reset, handleSubmit } = useForm<ScaleFormData>({ defaultValues: DEFAULTS })

  const [mode, width, height, keepAspect, method] = watch(["mode", "width", "height", "keepAspect", "method"])

  useEffect(() => {
    if (open) {
      reset(DEFAULTS)
      setError(null)
    }
  }, [open, reset])

  const calculateNewDimensions = () => {
    const newWidth = mode === "percent" ? Math.round((origW * width) / 100) : Math.round(width)
    const newHeight = keepAspect
      ? Math.round(newWidth / aspect)
      : mode === "percent"
        ? Math.round((origH * height) / 100)
        : Math.round(height)
    return { width: newWidth, height: newHeight }
  }

  const handleModeChange = (newMode: ScaleFormData["mode"]) => {
    const { width: w, height: h } = calculateNewDimensions()
    setValue("width", newMode === "percent" ? Math.round((w / origW) * 100) : w)
    setValue("height", newMode === "percent" ? Math.round((h / origH) * 100) : h)
    setValue("mode", newMode)
  }

  const handleWidthChange = (w: number) => {
    setValue("width", w)
    if (keepAspect) setValue("height", mode === "pixels" ? Math.round(w / aspect) : w)
  }

  const handleHeightChange = (h: number) => {
    setValue("height", h)
    if (keepAspect) setValue("width", mode === "pixels" ? Math.round(h * aspect) : h)
  }

  const handleKeepAspectChange = (checked: boolean) => {
    setValue("keepAspect", checked)
    if (checked) setValue("height", mode === "pixels" ? Math.round(width / aspect) : width)
  }

  const onSubmit = async () => {
    const { width: newW, height: newH } = calculateNewDimensions()
    if (newW < 1 || newH < 1) {
      setError("Размер должен быть не меньше 1 px")
      return
    }
    if (newW > MAX_SIZE || newH > MAX_SIZE) {
      setError(`Размер не может превышать ${MAX_SIZE} px по каждой стороне`)
      return
    }
    setError(null)
    setBusy(true)
    setProgress(0)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await onConfirm(newW, newH, method, { onProgress: setProgress, signal: controller.signal })
      onClose()
    } catch (err) {
      if (!isCancelled(err)) {
        console.error("Ошибка обработки изображения:", err)
        setError("Не удалось изменить размер изображения")
      }
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }

  // Во время обработки «Отмена» прерывает фоновую задачу
  const handleCancel = () => {
    if (abortRef.current) abortRef.current.abort()
    else onClose()
  }

  const { width: newW, height: newH } = calculateNewDimensions()

  if (!open) return null

  const limits =
    mode === "percent"
      ? { min: { value: 1, message: "Минимум 1%" }, max: { value: MAX_PERCENT, message: `Максимум ${MAX_PERCENT}%` } }
      : { min: { value: 1, message: "Минимум 1 px" }, max: { value: MAX_SIZE, message: `Максимум ${MAX_SIZE} px` } }

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth fullScreen={isPhone}>
      <DialogTitle>Изменение размера изображения</DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Typography variant="body2" gutterBottom>
            Исходный размер: {origW} × {origH} px ({((origW * origH) / 1_000_000).toFixed(2)} Мп)
          </Typography>
          <Typography variant="body2" gutterBottom>
            Новый размер: {newW} × {newH} px ({((newW * newH) / 1_000_000).toFixed(2)} Мп)
          </Typography>

          <Controller
            name="mode"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="dense">
                <InputLabel id="mode-label">Единицы</InputLabel>
                <Select
                  {...field}
                  labelId="mode-label"
                  label="Единицы"
                  onChange={(e) => handleModeChange(e.target.value as ScaleFormData["mode"])}
                >
                  <MenuItem value="percent">Проценты</MenuItem>
                  <MenuItem value="pixels">Пиксели</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="width"
            control={control}
            rules={limits}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                margin="dense"
                fullWidth
                label={mode === "percent" ? "Ширина, %" : "Ширина, px"}
                type="number"
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                error={!!fieldState.error}
                helperText={fieldState.error?.message || " "}
              />
            )}
          />

          <Controller
            name="height"
            control={control}
            rules={limits}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                margin="dense"
                fullWidth
                label={mode === "percent" ? "Высота, %" : "Высота, px"}
                type="number"
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                error={!!fieldState.error}
                helperText={fieldState.error?.message || " "}
              />
            )}
          />

          <Controller
            name="keepAspect"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={field.value}
                    onChange={(e) => handleKeepAspectChange(e.target.checked)}
                  />
                }
                label="Сохранять пропорции"
              />
            )}
          />

          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="dense">
                <InputLabel id="method-label">Интерполяция</InputLabel>
                <Select {...field} labelId="method-label" label="Интерполяция">
                  {interpolateOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      <Tooltip title={o.desc} placement="right">
                        <span>{o.label}</span>
                      </Tooltip>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          {busy && (
            <>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Обработка в фоновом потоке: {Math.round(progress * 100)}%
              </Typography>
              <LinearProgress variant="determinate" value={progress * 100} />
            </>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Применить
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ScaleModal
