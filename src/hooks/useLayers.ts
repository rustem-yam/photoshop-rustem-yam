import { useState, useCallback } from "react"
import type { LayersState, Layer } from "../types/layers"

export const useLayers = (initialState?: Partial<LayersState>) => {
  const [layersState, setLayersState] = useState<LayersState>({
    layers: [],
    activeLayerId: null,
    ...initialState,
  })

  const addLayer = useCallback((layer: Layer) => {
    setLayersState((prev) => ({
      ...prev,
      layers: [...prev.layers, layer],
      activeLayerId: layer.id,
    }))
  }, [])

  const removeLayer = useCallback((layerId: string) => {
    setLayersState((prev) => ({
      ...prev,
      layers: prev.layers.filter((layer) => layer.id !== layerId),
      activeLayerId: prev.activeLayerId === layerId ? null : prev.activeLayerId,
    }))
  }, [])

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayersState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer)),
    }))
  }, [])

  const setActiveLayer = useCallback((layerId: string | null) => {
    setLayersState((prev) => ({
      ...prev,
      activeLayerId: layerId,
    }))
  }, [])

  const moveLayer = useCallback((fromIndex: number, toIndex: number) => {
    setLayersState((prev) => {
      const newLayers = [...prev.layers]
      const [movedLayer] = newLayers.splice(fromIndex, 1)
      newLayers.splice(toIndex, 0, movedLayer)

      return {
        ...prev,
        layers: newLayers,
      }
    })
  }, [])

  const getActiveLayer = useCallback((): Layer | null => {
    return layersState.layers.find((layer) => layer.id === layersState.activeLayerId) || null
  }, [layersState.layers, layersState.activeLayerId])

  const getVisibleLayers = useCallback((): Layer[] => {
    return layersState.layers.filter((layer) => layer.visible)
  }, [layersState.layers])

  return {
    layersState,
    setLayersState,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    moveLayer,
    getActiveLayer,
    getVisibleLayers,
  }
}
