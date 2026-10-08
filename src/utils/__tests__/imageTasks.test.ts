import { describe, it, expect } from "vitest"
import { isCancelled, runImageTask } from "../imageTasks"

const src = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) }

describe("runImageTask (fallback without Worker)", () => {
  it("resizes and keeps the source untouched", async () => {
    const progress: number[] = []
    const out = await runImageTask(
      { op: "resize", src, width: 4, height: 1, method: "nearest" },
      { onProgress: (p) => progress.push(p) }
    )
    expect([out.width, out.height]).toEqual([4, 1])
    expect(Array.from(out.data).filter((_, i) => i % 4 === 0)).toEqual([0, 0, 255, 255])
    expect(Array.from(src.data)).toEqual([0, 0, 0, 255, 255, 255, 255, 255])
    expect(progress[progress.length - 1]).toBe(1)
  })

  it("runs a filter task", async () => {
    const out = await runImageTask({
      op: "filter",
      src,
      options: {
        kind: "median",
        kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
        divisor: 1,
        offset: 0,
        absolute: false,
        channels: { r: true, g: true, b: true, a: false },
        edge: "extend",
      },
    })
    expect([out.width, out.height]).toEqual([2, 1])
  })

  it("rejects when cancelled", async () => {
    const controller = new AbortController()
    const task = runImageTask({ op: "resize", src, width: 4, height: 1, method: "bilinear" }, { signal: controller.signal })
    controller.abort()
    await expect(task).rejects.toSatisfy(isCancelled)
  })
})
