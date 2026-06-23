const KEY_PREFIX = 'activelearn_avatar_'

export function getAvatarOverride(userId: string): string | null {
  return localStorage.getItem(KEY_PREFIX + userId)
}

export function setAvatarOverride(userId: string, dataUrl: string): void {
  localStorage.setItem(KEY_PREFIX + userId, dataUrl)
}

export function clearAvatarOverride(userId: string): void {
  localStorage.removeItem(KEY_PREFIX + userId)
}

/**
 * Reads an image file and returns a small square JPEG data URL (default 128px).
 * Resizing keeps it well under storage limits and avoids huge base64 blobs.
 */
export function fileToResizedDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load the image.'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported.'))
          return
        }
        // center-crop to a square
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
