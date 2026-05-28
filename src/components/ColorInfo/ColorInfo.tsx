import React from "react"
import { Box, Typography, Tooltip, Chip } from "@mui/material"
import { Info as InfoIcon } from "@mui/icons-material"
import { calculateWCAGContrast, calculateAPCAContrast, rgbToHex, formatColorValue } from "@/utils/colorUtils"
import "./ColorInfo.scss"
import type { ColorInfo } from "@/types/tools"

interface ColorInfoProps {
  color: ColorInfo | null
  label: string
}

interface ContrastInfoProps {
  color1: ColorInfo | null
  color2: ColorInfo | null
}

const ColorSpaceTooltip: React.FC<{ space: string; description: string; ranges: string }> = ({
  space,
  description,
  ranges,
}) => (
  <Tooltip
    title={
      <Box>
        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>
          {space}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {description}
        </Typography>
        <Typography variant="caption" sx={{ color: "#ccc" }}>
          {ranges}
        </Typography>
      </Box>
    }
    arrow
    placement="top"
  >
    <Chip label={space} size="small" icon={<InfoIcon fontSize="small" />} variant="outlined" sx={{ cursor: "help" }} />
  </Tooltip>
)

const ColorInfoDisplay: React.FC<ColorInfoProps> = ({ color, label }) => {
  if (!color) {
    return (
      <Box className="color-info">
        <Box className="color-swatch" style={{ backgroundColor: "#f0f0f0" }} />
        <Box className="color-details">
          <Typography variant="body2" color="textSecondary">
            {label} не выбран
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box className="color-info">
      <Box className="color-swatch" style={{ backgroundColor: rgbToHex(color.r, color.g, color.b) }} />
      <Box className="color-details">
        <Typography variant="subtitle2" className="color-label">
          {label}
        </Typography>
        <Typography variant="body2" className="color-coordinates">
          Координаты: ({color.x}, {color.y})
        </Typography>

        <Box className="color-spaces">
          <Box className="color-space">
            <ColorSpaceTooltip
              space="RGB"
              description="Красный, Зеленый, Синий - основные цвета для отображения на экране"
              ranges="R: 0-255, G: 0-255, B: 0-255"
            />
            <Typography className="color-space-value">
              ({color.r}, {color.g}, {color.b})
            </Typography>
          </Box>

          <Box className="color-space">
            <ColorSpaceTooltip
              space="XYZ"
              description="CIE XYZ - цветовое пространство, основанное на человеческом восприятии"
              ranges="X: 0-0.95, Y: 0-1.0, Z: 0-1.09"
            />
            <Typography className="color-space-value">
              ({formatColorValue(color.xyz.x)}, {formatColorValue(color.xyz.y)}, {formatColorValue(color.xyz.z)})
            </Typography>
          </Box>

          <Box className="color-space">
            <ColorSpaceTooltip
              space="CIELAB"
              description="CIE Lab - равномерное цветовое пространство, L - светлота, a - зелено-красная ось, b - сине-желтая ось"
              ranges="L: 0-100, a: ~-128..127, b: ~-128..127 (D65)"
            />
            <Typography className="color-space-value">
              ({formatColorValue(color.lab.l)}, {formatColorValue(color.lab.a)}, {formatColorValue(color.lab.b)})
            </Typography>
          </Box>

          <Box className="color-space">
            <ColorSpaceTooltip
              space="LCh"
              description="CIE LCh(ab) - цилиндрическая форма Lab: L - светлота, C - хрома (насыщенность), h - цветовой тон"
              ranges="L: 0-100, C: 0-~134, h: 0-360°"
            />
            <Typography className="color-space-value">
              ({formatColorValue(color.lch.l)}, {formatColorValue(color.lch.c)}, {formatColorValue(color.lch.h)}°)
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

const ContrastInfo: React.FC<ContrastInfoProps> = ({ color1, color2 }) => {
  if (!color1 || !color2) {
    return (
      <Box className="contrast-info">
        <Typography variant="body2" className="no-colors-message">
          Выберите два цвета для расчета контраста
        </Typography>
      </Box>
    )
  }

  const wcagContrast = calculateWCAGContrast(color1, color2)
  const apcaContrast = calculateAPCAContrast(color1, color2)
  const isSufficient = wcagContrast >= 4.5

  return (
    <Box className="contrast-info">
      <Typography variant="h6" className="contrast-title">
        Контраст между цветами
      </Typography>

      <Box className="contrast-values">
        <Box className="contrast-item">
          <Typography variant="body2" className="contrast-label">
            WCAG 2.1:
          </Typography>
          <Typography className={`contrast-value ${isSufficient ? "sufficient" : "insufficient"}`}>
            {formatColorValue(wcagContrast, 2)}:1
          </Typography>
        </Box>

        <Box className="contrast-item">
          <Typography variant="body2" className="contrast-label">
            APCA (WCAG 3.0):
          </Typography>
          <Typography className="contrast-value">{formatColorValue(Math.abs(apcaContrast), 1)}</Typography>
        </Box>
      </Box>

      <Typography variant="body2" className={`contrast-description ${isSufficient ? "sufficient" : "insufficient"}`}>
        {isSufficient
          ? "Контраст достаточен для обычного текста (≥4.5:1)"
          : "Контраст недостаточен для обычного текста (<4.5:1)"}
      </Typography>
    </Box>
  )
}

export { ColorInfoDisplay, ContrastInfo }
