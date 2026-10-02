import { executeTask, type ImageTask, type WorkerResponse } from "./tasks"

// Минимальный тип глобального объекта воркера (в проекте подключена библиотека DOM, а не WebWorker)
interface WorkerScope {
  onmessage: ((event: MessageEvent<ImageTask>) => void) | null
  postMessage: (message: WorkerResponse, options?: { transfer?: Transferable[] }) => void
}

const scope = self as unknown as WorkerScope

scope.onmessage = (event) => {
  try {
    let lastPercent = -1
    const result = executeTask(event.data, (fraction) => {
      const percent = Math.floor(fraction * 100)
      if (percent !== lastPercent) {
        lastPercent = percent
        scope.postMessage({ type: "progress", value: fraction })
      }
    })
    // Буфер результата передаётся в основной поток без копирования
    scope.postMessage({ type: "done", result }, { transfer: [result.data.buffer] })
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) })
  }
}
