import { useCallback, useMemo, useState } from "react"
import { useLayers } from "@/hooks/useLayers"
import { getDocumentSize } from "@/utils/compositing"
import { decodeImageFile } from "@/utils/imageUtils"
import { createLayerFromImageData, withLayerImage } from "@/utils/layerUtils"
import type { ResizeMethod } from "@/utils/interpolation"
import { runImageTask } from "@/utils/imageTasks"
import { toImageData } from "@/utils/raster"
import type { Layer } from "@/types/layers"

export type { ResizeMethod }

export interface ProgressOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface DocumentInfo {
  fileName: string
  depth: number
}

// Документ = набор слоёв + сведения об исходном файле
export const useImageDocument = () => {
  const { layersState, setLayersState } = useLayers()
  const [info, setInfo] = useState<DocumentInfo | null>(null)
  // Увеличивается при открытии нового файла (для сброса вида)
  const [version, setVersion] = useState(0)

  const size = useMemo(() => getDocumentSize(layersState.layers), [layersState.layers])
  const hasImage = layersState.layers.length > 0

  // Активный слой; если не выбран — верхний
  const activeLayer: Layer | null = useMemo(() => {
    const { layers, activeLayerId } = layersState
    return layers.find((l) => l.id === activeLayerId) ?? layers[layers.length - 1] ?? null
  }, [layersState])

  const openFile = useCallback(
    async (file: File) => {
      const { imageData, depth } = await decodeImageFile(file)
      const layer = createLayerFromImageData(imageData, "Слой 1")
      setLayersState({ layers: [layer], activeLayerId: layer.id })
      setInfo({ fileName: file.name, depth })
      setVersion((v) => v + 1)
    },
    [setLayersState]
  )

  const replaceLayerImage = useCallback(
    (layerId: string, imageData: ImageData) => {
      setLayersState({
        ...layersState,
        layers: layersState.layers.map((l) => (l.id === layerId ? withLayerImage(l, imageData) : l)),
      })
    },
    [layersState, setLayersState]
  )

  // Изменение реального размера изображения: масштабируются все слои (в фоновом потоке)
  const resizeDocument = useCallback(
    async (width: number, height: number, method: ResizeMethod, { onProgress, signal }: ProgressOptions = {}) => {
      const { layers } = layersState
      const doc = getDocumentSize(layers)
      if (!doc.width || !doc.height) return

      const resized: Layer[] = []
      for (let k = 0; k < layers.length; k++) {
        const layer = layers[k]
        const src = layer.imageData
        const w = src.width === doc.width ? width : Math.max(1, Math.round((src.width * width) / doc.width))
        const h = src.height === doc.height ? height : Math.max(1, Math.round((src.height * height) / doc.height))
        const result = await runImageTask(
          { op: "resize", src, width: w, height: h, method },
          { signal, onProgress: (p) => onProgress?.((k + p) / layers.length) }
        )
        resized.push(withLayerImage(layer, toImageData(result)))
      }
      setLayersState((prev) => ({ ...prev, layers: resized }))
    },
    [layersState, setLayersState]
  )

  return {
    layersState,
    setLayersState,
    info,
    size,
    version,
    hasImage,
    activeLayer,
    openFile,
    replaceLayerImage,
    resizeDocument,
  }
}
