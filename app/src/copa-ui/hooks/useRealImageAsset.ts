import { useEffect, useState } from 'react'

/** True when the image loads and is larger than a 1×1 stub. */
export function useRealImageAsset(src: string | null | undefined): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (!src) {
      setOk(false)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setOk(img.naturalWidth > 1 && img.naturalHeight > 1)
    }
    img.onerror = () => {
      if (!cancelled) setOk(false)
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])
  return ok
}
