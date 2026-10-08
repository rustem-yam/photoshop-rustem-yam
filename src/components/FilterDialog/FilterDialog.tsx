import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material"
import ToolDialog from "@/components/ToolDialog/ToolDialog"
import NumberField from "@/components/NumberField/NumberField"
import { analyzeRaster } from "@/utils/channels"
import {
  EDGE_MODES,
  FILTER_PRESETS,
  kernelSum,
  matchPreset,
  presetOptions,
  type ChannelMask,
  type EdgeMode,
  type FilterOptions,
  type FilterPresetId,
} from "@/utils/filters"
import { isCancelled, runImageTask } from "@/utils/imageTasks"
import type { Raster } from "@/utils/raster"
import "./FilterDialog.scss"

interface FilterDialogProps {
  open: boolean
  layerName: string
  source: Raster | null
  onPreview: (raster: Raster | null) => void
  onApply: (raster: Raster) => void
  onClose: () => void
}

const DEFAULT_CHANNELS: ChannelMask = { r: true, g: true, b: true, a: false }
const PREVIEW_DELAY = 250

const defaultOptions = () => presetOptions("identity", DEFAULT_CHANNELS, "extend")

// Ничего не изменится: тождественное ядро или не выбран ни один канал
const isNoop = (o: FilterOptions) =>
  (!o.channels.r && !o.channels.g && !o.channels.b && !o.channels.a) || matchPreset(o) === "identity"

const FilterDialog: React.FC<FilterDialogProps> = ({ open, layerName, source, onPreview, onApply, onClose }) => {
  const [options, setOptions] = useState<FilterOptions>(defaultOptions)
  const [previewOn, setPreviewOn] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const applyAbort = useRef<AbortController | null>(null)
  // Последний готовый результат предпросмотра — чтобы не считать заново при «Применить»
  const lastPreview = useRef<{ key: string; source: Raster; result: Raster } | null>(null)

  useEffect(() => {
    if (open) {
      setOptions(defaultOptions())
      setError(null)
      lastPreview.current = null
    }
  }, [open])

  const analysis = useMemo(() => (source ? analyzeRaster(source) : null), [source])
  const isGray = analysis?.isGray ?? false
  const hasAlpha = analysis?.hasAlpha ?? false
  const presetId = matchPreset(options)
  const noop = isNoop(options)
  const optionsKey = JSON.stringify(options)

  // Предпросмотр: пересчёт в воркере через паузу после изменения параметров; старый расчёт отменяется
  useEffect(() => {
    if (!open || !source || applying) return
    if (!previewOn || noop) {
      onPreview(null)
      setProgress(null)
      return
    }
    const cached = lastPreview.current
    if (cached && cached.key === optionsKey && cached.source === source) {
      onPreview(cached.result)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setProgress(0)
      runImageTask({ op: "filter", src: source, options }, { signal: controller.signal, onProgress: setProgress })
        .then((result) => {
          lastPreview.current = { key: optionsKey, source, result }
          onPreview(result)
          setProgress(null)
        })
        .catch((err) => {
          if (!isCancelled(err)) setError(err instanceof Error ? err.message : String(err))
        })
    }, PREVIEW_DELAY)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // options сравниваются через optionsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source, optionsKey, previewOn, noop, applying, onPreview])

  const update = (patch: Partial<FilterOptions>) => setOptions((prev) => ({ ...prev, ...patch }))

  const selectPreset = (id: FilterPresetId) => setOptions((prev) => presetOptions(id, prev.channels, prev.edge))

  const setKernelCell = (index: number, value: number) =>
    setOptions((prev) => ({ ...prev, kernel: prev.kernel.map((v, i) => (i === index ? value : v)) }))

  const setChannel = (key: keyof ChannelMask, value: boolean) =>
    setOptions((prev) => ({
      ...prev,
      channels: key === "r" && isGray ? { ...prev.channels, r: value, g: value, b: value } : { ...prev.channels, [key]: value },
    }))

  const close = () => {
    applyAbort.current?.abort()
    onPreview(null)
    onClose()
  }

  const apply = async () => {
    if (!source) return
    if (noop) {
      close()
      return
    }
    const cached = lastPreview.current
    if (cached && cached.key === optionsKey && cached.source === source) {
      onApply(cached.result)
      return
    }
    const controller = new AbortController()
    applyAbort.current = controller
    setApplying(true)
    setProgress(0)
    setError(null)
    try {
      const result = await runImageTask(
        { op: "filter", src: source, options },
        { signal: controller.signal, onProgress: setProgress }
      )
      onApply(result)
    } catch (err) {
      if (!isCancelled(err)) setError(err instanceof Error ? err.message : String(err))
    } finally {
      applyAbort.current = null
      setApplying(false)
      setProgress(null)
    }
  }

  const isMedian = options.kind === "median"
  const channelBoxes: { key: keyof ChannelMask; label: string }[] = isGray
    ? [{ key: "r", label: "Серый" }]
    : [
        { key: "r", label: "R" },
        { key: "g", label: "G" },
        { key: "b", label: "B" },
      ]
  if (hasAlpha || options.channels.a) channelBoxes.push({ key: "a", label: "Альфа" })

  return (
    <ToolDialog
      open={open}
      title={`Фильтрация — ${layerName}`}
      onClose={close}
      width={460}
      actions={
        <>
          <Button onClick={() => setOptions(defaultOptions())} disabled={applying}>
            Сбросить
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={applying ? () => applyAbort.current?.abort() : close}>
            {applying ? "Прервать" : "Отмена"}
          </Button>
          <Button variant="contained" onClick={apply} disabled={!source || applying}>
            Применить
          </Button>
        </>
      }
    >
      <Box className="filter-dialog">
        <FormControl size="small" fullWidth>
          <InputLabel id="filter-preset-label">Фильтр</InputLabel>
          <Select
            labelId="filter-preset-label"
            label="Фильтр"
            value={presetId ?? "custom"}
            onChange={(e) => e.target.value !== "custom" && selectPreset(e.target.value as FilterPresetId)}
          >
            {(Object.keys(FILTER_PRESETS) as FilterPresetId[]).map((id) => (
              <MenuItem key={id} value={id}>
                {FILTER_PRESETS[id].name}
              </MenuItem>
            ))}
            <MenuItem value="custom" disabled={presetId !== null}>
              Пользовательское ядро
            </MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          {presetId ? FILTER_PRESETS[presetId].description : "Ядро изменено вручную."}
        </Typography>

        <Box className="filter-kernel-block">
          <FormLabel className="filter-label">Ядро 3×3{isMedian ? " (не используется медианным фильтром)" : ""}</FormLabel>
          <Box className="filter-kernel">
            {options.kernel.map((value, i) => (
              <NumberField
                key={i}
                value={value}
                decimals="auto"
                min={-1000}
                max={1000}
                disabled={isMedian}
                ariaLabel={`Ядро, строка ${Math.floor(i / 3) + 1}, столбец ${(i % 3) + 1}`}
                onChange={(v) => setKernelCell(i, v)}
              />
            ))}
          </Box>

          <Box className="filter-params">
            <NumberField
              label="Делитель"
              value={options.divisor}
              decimals="auto"
              min={-10000}
              max={10000}
              disabled={isMedian}
              onChange={(v) => update({ divisor: v === 0 ? 1 : v })}
            />
            <NumberField
              label="Смещение"
              value={options.offset}
              min={-255}
              max={255}
              disabled={isMedian}
              onChange={(v) => update({ offset: Math.round(v) })}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={isMedian}
              onClick={() => update({ divisor: kernelSum(options.kernel) || 1 })}
              title="Делитель = сумма коэффициентов ядра"
            >
              Нормировать
            </Button>
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={options.absolute}
                disabled={isMedian}
                onChange={(e) => update({ absolute: e.target.checked })}
              />
            }
            label="Модуль результата |x| (для выделения границ)"
          />
        </Box>

        <FormControl component="fieldset">
          <FormLabel className="filter-label">Каналы</FormLabel>
          <FormGroup row>
            {channelBoxes.map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox size="small" checked={options.channels[key]} onChange={(e) => setChannel(key, e.target.checked)} />
                }
                label={label}
              />
            ))}
          </FormGroup>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="filter-edge-label">Края изображения</InputLabel>
          <Select
            labelId="filter-edge-label"
            label="Края изображения"
            value={options.edge}
            onChange={(e) => update({ edge: e.target.value as EdgeMode })}
          >
            {(Object.keys(EDGE_MODES) as EdgeMode[]).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {EDGE_MODES[mode].name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          {EDGE_MODES[options.edge].description}
        </Typography>

        <FormControlLabel
          control={<Checkbox checked={previewOn} onChange={(e) => setPreviewOn(e.target.checked)} />}
          label="Предпросмотр"
        />

        {progress !== null && (
          <Box>
            <Typography variant="caption">
              {applying ? "Применение" : "Предпросмотр"}: обработка в фоновом потоке, {Math.round(progress * 100)}%
            </Typography>
            <LinearProgress variant="determinate" value={progress * 100} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Box>
    </ToolDialog>
  )
}

export default FilterDialog
