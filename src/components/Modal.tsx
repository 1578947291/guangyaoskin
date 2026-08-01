import { useEffect, type ReactNode } from 'react'
import { CuteIcon } from './CuteIcon'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Modal({ title, open, onClose, children, className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.classList.add('modal-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-sheet${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭" title="关闭">
            <CuteIcon name="close" size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}
