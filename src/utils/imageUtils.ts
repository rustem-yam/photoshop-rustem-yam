import UPNG from "upng-js"

export async function getImageDepth(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()

  if (file.type === "image/png") {
    const png = UPNG.decode(arrayBuffer)
    return png.depth
  }

  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise((res) => (img.onload = res))

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return 24

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, 1, 1)
  return imageData.data.length * 8
}

export const isTransparentFile = (fileName: string): boolean => {
  const ext = fileName.split(".").pop()?.toLowerCase()
  return ext === "png"
}

export const loadImage = (file: File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject

    if (typeof file === "string") {
      img.src = file
    } else {
      img.src = URL.createObjectURL(file)
    }
  })
}
