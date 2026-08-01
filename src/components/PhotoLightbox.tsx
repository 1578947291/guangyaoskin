import { useEffect, useRef, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface PhotoLightboxProps {
  name: string
  photos: string[]
  activeIndex: number | null
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

export function PhotoLightbox({ name, photos, activeIndex, onClose, onPrevious, onNext }: PhotoLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const open = activeIndex !== null && Boolean(photos[activeIndex])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (photos.length > 1 && event.key === 'ArrowLeft') onPrevious()
      if (photos.length > 1 && event.key === 'ArrowRight') onNext()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, onNext, onPrevious, photos.length])

  if (!open || activeIndex === null) return null

  const stopPropagation = (event: MouseEvent) => event.stopPropagation()
  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`查看${name}的照片`} onMouseDown={onClose}>
      <header className="photo-lightbox-header" onMouseDown={stopPropagation}>
        <span>{activeIndex + 1} / {photos.length}</span>
        <button ref={closeButtonRef} className="photo-lightbox-button" type="button" onClick={onClose} aria-label="关闭大图" title="关闭">
          <X size={22} />
        </button>
      </header>
      <div className="photo-lightbox-stage" onMouseDown={stopPropagation}>
        <img src={photos[activeIndex]} alt={`${name}的关联照片大图 ${activeIndex + 1}`} />
      </div>
      {photos.length > 1 ? (
        <div className="photo-lightbox-controls" onMouseDown={stopPropagation}>
          <button className="photo-lightbox-button" type="button" onClick={onPrevious} aria-label="查看上一张照片" title="上一张"><ChevronLeft size={25} /></button>
          <button className="photo-lightbox-button" type="button" onClick={onNext} aria-label="查看下一张照片" title="下一张"><ChevronRight size={25} /></button>
        </div>
      ) : null}
    </div>
  )
}
