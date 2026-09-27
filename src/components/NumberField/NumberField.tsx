import React, { useEffect, useState } from "react"
import { TextField } from "@mui/material"

interface NumberFieldProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

const format = (v: number, decimals: number) => (decimals > 0 ? v.toFixed(decimals) : String(Math.round(v)))

// Числовое поле: пока пользователь печатает (например «1.» или «-»), значение не сбрасывается;
// корректное число сразу передаётся наружу, при потере фокуса поле приводится к допустимому значению
const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 0,
  disabled,
  className,
  ariaLabel,
}) => {
  const [draft, setDraft] = useState(format(value, decimals))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(format(value, decimals))
  }, [value, decimals, focused])

  const parse = (text: string) => {
    const n = Number(text.replace(",", "."))
    return text.trim() !== "" && Number.isFinite(n) ? n : null
  }

  return (
    <TextField
      label={label}
      size="small"
      type="text"
      value={draft}
      disabled={disabled}
      className={className}
      slotProps={{ htmlInput: { inputMode: "decimal", step, "aria-label": ariaLabel ?? label } }}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = parse(e.target.value)
        if (n !== null && n >= min && n <= max) onChange(n)
      }}
      onBlur={() => {
        setFocused(false)
        const n = parse(draft)
        const clamped = n === null ? value : Math.min(max, Math.max(min, n))
        if (clamped !== value) onChange(clamped)
        setDraft(format(clamped, decimals))
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export default NumberField
