import React, { useEffect, useState } from "react"
import "./StatusBar.scss"
import { Typography, Slider, IconButton, Tooltip } from "@mui/material"
import { Add, FitScreen, Remove } from "@mui/icons-material"
import { MAX_SCALE, MIN_SCALE, clampScale, stepScale } from "@/utils/zoom"

interface StatusBarProps {
  width: number
  height: number
  depth: number
  scale: number
  onScaleChange: (v: number) => void
  onFit: () => void
  note?: string
}

const StatusBar: React.FC<StatusBarProps> = ({ width, height, depth, scale, onScaleChange, onFit, note }) => {
  // Черновик значения в поле ввода; применяется по Enter или при потере фокуса
  const [draft, setDraft] = useState(String(scale))
  useEffect(() => setDraft(String(scale)), [scale])

  const commitDraft = () => {
    const value = Number(draft)
    if (Number.isFinite(value) && draft.trim() !== "") onScaleChange(clampScale(value))
    else setDraft(String(scale))
  }

  return (
    <div className="status-bar">
      <Typography variant="body2" className="status-info">
        Ширина: {width}px | Высота: {height}px | Глубина: {depth}-bit
        {note && <span className="status-note"> | {note}</span>}
      </Typography>

      <div className="scale-controls">
        <Typography variant="body2" className="scale-label">
          Масштаб:
        </Typography>
        <Tooltip title="Уменьшить">
          <span>
            <IconButton
              size="small"
              onClick={() => onScaleChange(stepScale(scale, -1))}
              disabled={scale <= MIN_SCALE}
              aria-label="Уменьшить масштаб"
            >
              <Remove fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Slider
          className="scale-slider"
          value={scale}
          size="small"
          onChange={(_, v) => onScaleChange(v as number)}
          min={MIN_SCALE}
          max={MAX_SCALE}
          aria-label="Масштаб просмотра"
        />
        <Tooltip title="Увеличить">
          <span>
            <IconButton
              size="small"
              onClick={() => onScaleChange(stepScale(scale, 1))}
              disabled={scale >= MAX_SCALE}
              aria-label="Увеличить масштаб"
            >
              <Add fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <label className="scale-input">
          <input
            type="number"
            min={MIN_SCALE}
            max={MAX_SCALE}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => e.key === "Enter" && commitDraft()}
            aria-label="Масштаб в процентах"
          />
          %
        </label>
        <Tooltip title="Вписать в окно">
          <IconButton size="small" onClick={onFit} aria-label="Вписать в окно">
            <FitScreen fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  )
}

export default StatusBar
