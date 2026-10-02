import { bilinearResize, nearestNeighborResize, type ProgressCallback, type ResizeMethod } from "../utils/interpolation"
import type { Raster } from "../utils/raster"

// Задачи, которые выполняются в Web Worker (или синхронно, если воркеры недоступны)
export type ImageTask = { op: "resize"; src: Raster; width: number; height: number; method: ResizeMethod }

export type WorkerResponse =
  | { type: "progress"; value: number }
  | { type: "done"; result: Raster }
  | { type: "error"; message: string }

export function executeTask(task: ImageTask, onProgress?: ProgressCallback): Raster {
  switch (task.op) {
    case "resize": {
      const resize = task.method === "nearest" ? nearestNeighborResize : bilinearResize
      return resize(task.src, task.width, task.height, onProgress)
    }
  }
}
