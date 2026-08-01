import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  Maximize2,
  MessageCircle,
  UserRound,
  WalletCards,
  X
} from 'lucide-react'
import { db } from '../db'
import { appointmentPhotos } from '../lib/appointmentPhotos'
import { preparePhoto } from '../lib/images'
import type { Appointment, AppointmentService, AppointmentStatus, Notify } from '../types'

const statusLabels: Record<AppointmentStatus, string> = {
  upcoming: '待服务',
  completed: '已完成',
  cancelled: '已取消'
}

const serviceLabels: Record<AppointmentService, string> = {
  experience: '体验',
  'full-face': '全脸'
}

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

interface AppointmentDetailPageProps {
  appointment: Appointment
  notify: Notify
  onBack: () => void
}

export function AppointmentDetailPage({ appointment, notify, onBack }: AppointmentDetailPageProps) {
  const [photoBusy, setPhotoBusy] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const photos = appointmentPhotos(appointment)
  const scheduledAt = new Date(appointment.scheduledAt)
  const name = appointment.nickname || appointment.customerName
  const serviceName = appointment.appointmentType
    ? serviceLabels[appointment.appointmentType]
    : appointment.serviceName

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    setPhotoBusy(true)
    try {
      const addedPhotos = await Promise.all(files.map(preparePhoto))
      const nextPhotos = Array.from(new Set([...photos, ...addedPhotos]))
      await db.appointments.update(appointment.id, {
        photoDataUrl: nextPhotos[0],
        photoDataUrls: nextPhotos
      })
      notify(`已关联 ${addedPhotos.length} 张照片`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '照片处理失败')
    } finally {
      setPhotoBusy(false)
    }
  }

  const showPrevious = () => setViewerIndex((current) => current === null
    ? null
    : (current - 1 + photos.length) % photos.length)
  const showNext = () => setViewerIndex((current) => current === null
    ? null
    : (current + 1) % photos.length)

  return (
    <section className="page appointment-detail-page">
      <header className="detail-page-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回预约列表" title="返回">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p>APPOINTMENT DETAIL</p>
          <h1>预约详情</h1>
        </div>
        <span className={`status-badge ${appointment.status}`}>{statusLabels[appointment.status]}</span>
      </header>

      <section className="detail-summary-panel surface" aria-label="预约资料总览">
        <div className="detail-identity">
          <span className="detail-avatar"><UserRound size={26} /></span>
          <div>
            <h2>{name}</h2>
            <p>{appointment.wechatId || '未填写微信号'}</p>
          </div>
        </div>

        <div className="detail-info-grid" aria-label="预约信息">
          <DetailItem icon={CalendarDays} label="预约日期" value={format(scheduledAt, 'yyyy年M月d日 EEEE', { locale: zhCN })} />
          <DetailItem icon={Clock3} label="预约时间" value={format(scheduledAt, 'HH:mm')} />
          <DetailItem icon={Camera} label="预约项目" value={serviceName || '未设置'} />
          <DetailItem icon={WalletCards} label="预约金额" value={appointment.amount ? currency.format(appointment.amount) : '未记账'} />
        </div>

        <div className="detail-notes">
          <header><MessageCircle size={17} /><h2>备注</h2></header>
          <p className={appointment.notes ? '' : 'empty'}>{appointment.notes || '无备注'}</p>
        </div>

        {appointment.cancelReason ? (
          <div className="detail-cancel-reason" aria-label="取消原因">
            <strong>取消原因</strong>
            <p>{appointment.cancelReason}</p>
          </div>
        ) : null}
      </section>

      <section className="detail-gallery-section">
        <header className="detail-section-heading">
          <div><h2>关联照片</h2><p>{photos.length ? `共 ${photos.length} 张` : '还没有关联照片'}</p></div>
          <label className={`secondary-button detail-photo-picker${photoBusy ? ' disabled' : ''}`}>
            <input className="visually-hidden-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={photoBusy} />
            <ImagePlus size={17} />{photoBusy ? '处理中...' : '添加照片'}
          </label>
        </header>

        {photos.length ? (
          <div className="detail-photo-grid">
            {photos.map((photo, index) => (
              <button type="button" key={`${photo.slice(-24)}-${index}`} onClick={() => setViewerIndex(index)} aria-label={`查看第 ${index + 1} 张照片大图`}>
                <img src={photo} alt={`${name}的关联照片 ${index + 1}`} />
                <span><Maximize2 size={16} /></span>
              </button>
            ))}
          </div>
        ) : (
          <label className="detail-photo-empty surface">
            <input className="visually-hidden-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={photoBusy} />
            <ImagePlus size={25} />
            <strong>{photoBusy ? '正在处理照片...' : '添加顾客照片'}</strong>
            <span>可一次选择多张照片</span>
          </label>
        )}
        {appointment.status === 'completed' ? <p className="detail-gallery-hint">订单已完成，仍可继续关联护理后的照片</p> : null}
      </section>

      <PhotoLightbox
        name={name}
        photos={photos}
        activeIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onPrevious={showPrevious}
        onNext={showNext}
      />
    </section>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <article className="detail-info-item">
      <span><Icon size={18} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  )
}

interface PhotoLightboxProps {
  name: string
  photos: string[]
  activeIndex: number | null
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

function PhotoLightbox({ name, photos, activeIndex, onClose, onPrevious, onNext }: PhotoLightboxProps) {
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
