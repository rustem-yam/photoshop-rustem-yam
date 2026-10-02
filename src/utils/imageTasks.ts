import { executeTask, type ImageTask, type WorkerResponse } from "../workers/tasks"
import type { Raster } from "./raster"

export class TaskCancelledError extends Error {
  constructor() {
    super("Операция отменена")
    this.name = "TaskCancelledError"
  }
}

export const isCancelled = (error: unknown) => error instanceof TaskCancelledError

interface TaskOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

// Запуск обработки в отдельном потоке: интерфейс не зависает на больших изображениях,
// задачу можно отменить через AbortSignal (воркер сразу завершается)
export function runImageTask(task: ImageTask, { onProgress, signal }: TaskOptions = {}): Promise<Raster> {
  if (signal?.aborted) return Promise.reject(new TaskCancelledError())

  // Копия пикселей: исходный слой не меняется, а буфер копии передаётся воркеру без копирования
  const src: Raster = { width: task.src.width, height: task.src.height, data: new Uint8ClampedArray(task.src.data) }
  const payload: ImageTask = { ...task, src }

  // Без поддержки Web Worker (например, в тестах) — выполняем в основном потоке
  if (typeof Worker === "undefined") {
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        if (signal?.aborted) return reject(new TaskCancelledError())
        try {
          resolve(executeTask(payload, onProgress))
        } catch (error) {
          reject(error)
        }
      }, 0)
    )
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/imageWorker.ts", import.meta.url), { type: "module" })

    const finish = () => {
      worker.terminate()
      signal?.removeEventListener("abort", onAbort)
    }
    const onAbort = () => {
      finish()
      reject(new TaskCancelledError())
    }
    signal?.addEventListener("abort", onAbort)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (message.type === "progress") {
        onProgress?.(message.value)
      } else if (message.type === "done") {
        finish()
        resolve(message.result)
      } else {
        finish()
        reject(new Error(message.message))
      }
    }
    worker.onerror = (event) => {
      finish()
      reject(new Error(event.message || "Ошибка фоновой обработки"))
    }

    worker.postMessage(payload, [src.data.buffer])
  })
}
