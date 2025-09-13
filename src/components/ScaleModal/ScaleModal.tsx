import React, { useMemo, useEffect } from "react"
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
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"

interface ScaleModalProps {
  open: boolean
  onClose: () => void
  originalImage: HTMLImageElement | null
  onConfirm: (dataUrl: string, width: number, height: number) => Promise<void>
}

interface ScaleFormData {
  mode: "percent" | "pixels"
  width: number
  height: number
  keepAspect: boolean
  method: "nearest" | "bilinear"
}

const interpolateOptions = [
  { value: "bilinear", label: "Билинейная", desc: "Плавный результат, лучше при увеличении/уменьшении" },
  { value: "nearest", label: "Ближайший сосед", desc: "Быстрее, может давать пиксельный вид" },
]

const ScaleModal: React.FC<ScaleModalProps> = ({ open, onClose, originalImage, onConfirm }) => {
  const origW = originalImage?.naturalWidth ?? 0
  const origH = originalImage?.naturalHeight ?? 0
  const aspect = useMemo(() => (origW && origH ? origW / origH : 1), [origW, origH])

  const { control, watch, setValue, reset, handleSubmit } = useForm<ScaleFormData>({
    defaultValues: {
      mode: "percent",
      width: 100,
      height: 100,
      keepAspect: true,
      method: "bilinear",
    },
  })

  const [mode, width, height, keepAspect] = watch(["mode", "width", "height", "keepAspect"])

  // Сброс формы при открытии
  useEffect(() => {
    if (open) reset({ mode: "percent", width: 100, height: 100, keepAspect: true, method: "bilinear" })
  }, [open, reset])

  const calculateNewDimensions = () => {
    if (!originalImage) return { width: 0, height: 0 }
    const newWidth = mode === "percent" ? Math.round((origW * width) / 100) : width
    const newHeight = keepAspect
      ? Math.round(newWidth / aspect)
      : mode === "percent"
        ? Math.round((origH * height) / 100)
        : height
    return { width: newWidth, height: newHeight }
  }

  const handleModeChange = (newMode: "percent" | "pixels") => {
    if (!originalImage) return
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

  const onSubmit = async () => {
    if (!originalImage) return
    const { width: newW, height: newH } = calculateNewDimensions()
    try {
      const mod = await import("@/utils/interpolation")
      const canvas = document.createElement("canvas")
      canvas.width = origW
      canvas.height = origH
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(originalImage, 0, 0)
      const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const dst =
        watch("method") === "nearest" ? mod.nearestNeighborResize(src, newW, newH) : mod.bilinearResize(src, newW, newH)
      const out = document.createElement("canvas")
      out.width = newW
      out.height = newH
      out.getContext("2d")!.putImageData(dst, 0, 0)
      await onConfirm(out.toDataURL("image/png"), newW, newH)
      onClose()
    } catch (err) {
      console.error("Ошибка обработки изображения:", err)
    }
  }

  const { width: newW, height: newH } = calculateNewDimensions()
  const showNewSize = origW && origH && (width !== 100 || height !== 100)

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Изменение размера изображения</DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Typography variant="body2" gutterBottom>
            Исходный размер: {origW} × {origH}px ({((origW * origH) / 1_000_000).toFixed(2)} Мп)
          </Typography>

          {showNewSize && originalImage && (
            <Typography variant="body2" gutterBottom>
              Новый размер: {newW} × {newH} px ({((newW * newH) / 1_000_000).toFixed(2)} Мп)
            </Typography>
          )}

          <Controller
            name="mode"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="dense">
                <InputLabel id="mode-label">Режим</InputLabel>
                <Select
                  {...field}
                  labelId="mode-label"
                  label="Режим"
                  onChange={(e) => handleModeChange(e.target.value as any)}
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
            rules={{
              min: { value: 1, message: "Минимум 1" },
              max: { value: mode === "percent" ? 3000 : 10000, message: "Слишком большое значение" },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                margin="dense"
                fullWidth
                label={mode === "percent" ? "Ширина %" : "Ширина px"}
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
            rules={{
              min: { value: 1, message: "Минимум 1" },
              max: { value: mode === "percent" ? 3000 : 10000, message: "Слишком большое значение" },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                margin="dense"
                fullWidth
                label={mode === "percent" ? "Высота %" : "Высота px"}
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
                  <Checkbox {...field} checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
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
                <InputLabel id="method-label">Алгоритм</InputLabel>
                <Select {...field} labelId="method-label" label="Алгоритм">
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
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Отмена
          </Button>
          <Button type="submit" variant="contained">
            Применить
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ScaleModal
