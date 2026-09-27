import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import ToolDialog from "@/components/ToolDialog/ToolDialog"
import Histogram from "@/components/Histogram/Histogram"
import NumberField from "@/components/NumberField/NumberField"
import { computeHistogram, type HistogramScale } from "@/utils/histogram"
import { analyzeRaster } from "@/utils/channels"
import {
  applyLevels,
  defaultLevels,
  gammaToMidpoint,
  GAMMA_MAX,
  GAMMA_MIN,
  isIdentityLevels,
  midpointToGamma,
  type LevelsChannel,
  type LevelsChannelParams,
  type LevelsParams,
} from "@/utils/levels"
import type { Raster } from "@/utils/raster"
import "./LevelsDialog.scss"

interface LevelsDialogProps {
  open: boolean
  layerName: string
  source: Raster | null
  onPreview: (raster: Raster | null) => void
  onApply: (raster: Raster) => void
  onClose: () => void
}

const CHANNELS: { id: LevelsChannel; label: string; color: string }[] = [
  { id: "master", label: "Master (RGB)", color: "#dddddd" },
  { id: "r", label: "Красный", color: "#ef5350" },
  { id: "g", label: "Зелёный", color: "#66bb6a" },
  { id: "b", label: "Синий", color: "#42a5f5" },
]

const LevelsDialog: React.FC<LevelsDialogProps> = ({ open, layerName, source, onPreview, onApply, onClose }) => {
  const [params, setParams] = useState<LevelsParams>(defaultLevels)
  const [channel, setChannel] = useState<LevelsChannel>("master")
  const [scale, setScale] = useState<HistogramScale>("linear")
  const [preview, setPreview] = useState(true)

  useEffect(() => {
    if (open) {
      setParams(defaultLevels())
      setChannel("master")
    }
  }, [open])

  const histogram = useMemo(() => (source ? computeHistogram(source) : null), [source])
  const isGray = useMemo(() => (source ? analyzeRaster(source).isGray : false), [source])
  const identity = isIdentityLevels(params)

  // Предпросмотр: пересчёт не чаще одного раза за кадр
  useEffect(() => {
    if (!open || !source) return
    if (!preview || identity) {
      onPreview(null)
      return
    }
    const id = requestAnimationFrame(() => onPreview(applyLevels(source, params)))
    return () => cancelAnimationFrame(id)
  }, [open, source, params, preview, identity, onPreview])

  const current = params[channel]
  const channelInfo = CHANNELS.find((c) => c.id === channel)!
  const counts = histogram
    ? channel === "master"
      ? isGray
        ? histogram.r
        : histogram.luma
      : histogram[channel]
    : new Uint32Array(256)

  const updateChannel = (patch: Partial<LevelsChannelParams>) =>
    setParams((prev) => ({ ...prev, [channel]: { ...prev[channel], ...patch } }))

  const midpoint = gammaToMidpoint(current.black, current.white, current.gamma)

  const handleSlider = (_: Event, value: number | number[], activeThumb: number) => {
    const [b, m, w] = value as number[]
    if (activeThumb === 1) {
      updateChannel({ gamma: Number(midpointToGamma(current.black, current.white, m).toFixed(2)) })
    } else {
      const black = Math.min(b, 253)
      const white = Math.max(w, black + 2)
      updateChannel({ black, white })
    }
  }

  const close = () => {
    onPreview(null)
    onClose()
  }

  const apply = () => {
    if (!source) return
    onApply(identity ? source : applyLevels(source, params))
  }

  return (
    <ToolDialog
      open={open}
      title={`Уровни — ${layerName}`}
      onClose={close}
      actions={
        <>
          <Button onClick={() => setParams(defaultLevels())} disabled={identity}>
            Сбросить
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={close}>Отмена</Button>
          <Button variant="contained" onClick={apply} disabled={!source}>
            Применить
          </Button>
        </>
      }
    >
      <Box className="levels-dialog">
        <Box className="levels-row">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="levels-channel-label">Канал</InputLabel>
            <Select
              labelId="levels-channel-label"
              label="Канал"
              value={channel}
              onChange={(e) => setChannel(e.target.value as LevelsChannel)}
            >
              {(isGray ? CHANNELS.slice(0, 1) : CHANNELS).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {isGray && c.id === "master" ? "Master (серый)" : c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={scale}
            onChange={(_, v) => v && setScale(v)}
            aria-label="Масштаб гистограммы"
          >
            <ToggleButton value="linear">Линейная</ToggleButton>
            <ToggleButton value="log">Логарифм.</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Histogram counts={counts} scale={scale} color={channelInfo.color} range={[current.black, current.white]} />

        <Slider
          className="levels-slider"
          value={[current.black, midpoint, current.white]}
          min={0}
          max={255}
          step={1}
          track={false}
          disableSwap
          onChange={handleSlider}
          getAriaLabel={(i) => ["Ползунок чёрной точки", "Ползунок средних тонов", "Ползунок белой точки"][i]}
          valueLabelDisplay="off"
        />

        <Box className="levels-inputs">
          <NumberField
            label="Чёрная точка"
            value={current.black}
            min={0}
            max={current.white - 2}
            onChange={(v) => updateChannel({ black: Math.round(v) })}
          />
          <NumberField
            label="Гамма"
            value={current.gamma}
            min={GAMMA_MIN}
            max={GAMMA_MAX}
            step={0.01}
            decimals={2}
            onChange={(v) => updateChannel({ gamma: v })}
          />
          <NumberField
            label="Белая точка"
            value={current.white}
            min={current.black + 2}
            max={255}
            onChange={(v) => updateChannel({ white: Math.round(v) })}
          />
        </Box>

        <FormControlLabel
          control={<Checkbox checked={preview} onChange={(e) => setPreview(e.target.checked)} />}
          label="Предпросмотр"
        />

        <Typography variant="caption" color="text.secondary" component="p">
          Учтено пикселей: {histogram?.total ?? 0}. Master применяется поверх настроек отдельных каналов; альфа-канал не
          меняется.
        </Typography>
      </Box>
    </ToolDialog>
  )
}

export default LevelsDialog
