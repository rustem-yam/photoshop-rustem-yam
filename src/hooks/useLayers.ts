import { useState } from "react"
import type { LayersState } from "../types/layers"

// Состояние слоёв документа: список (снизу вверх) и активный слой
export const useLayers = (initialState?: Partial<LayersState>) => {
  const [layersState, setLayersState] = useState<LayersState>({
    layers: [],
    activeLayerId: null,
    ...initialState,
  })

  return { layersState, setLayersState }
}
