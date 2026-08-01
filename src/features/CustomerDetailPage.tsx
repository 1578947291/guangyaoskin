import { useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  ImagePlus,
  Maximize2,
  MessageCircle,
  Phone,
  UserRound,
  WalletCards
} from 'lucide-react'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { db } from '../db'
import { customerAppointments } from '../lib/customerAppointments'
import { customerPhotos } from '../lib/customerPhotos'
import { preparePhoto } from '../lib/images'
import type { AppointmentService, AppointmentStatus, CustomerRecord, Notify } from '../types'
import { AppointmentDetailPage } from './AppointmentDetailPage'

const serviceLabels: Record<AppointmentService, string> = {
  experience: '体验',
  'full-face': '全脸'
}

const statusLabels: Record<AppointmentStatus, string> = {
  upcoming: '待服务',
  completed: '已完成',
  cancelled: '已取消'
}

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

interface CustomerDetailPageProps {
  customer: CustomerRecord
  notify: Notify
  appointmentId?: string
  onBack: () => void
  onOpenAppointment: (appointmentId: string) => void
  onBackAppointment: () => void
}

export function CustomerDetailPage({
  customer,
  notify,
  appointmentId,
  onBack,
  onOpenAppointment,
  onBackAppointment
}: CustomerDetailPageProps) {
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const [photoBusy, setPhotoBusy] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const photos = customerPhotos(customer)
  const linkedAppointments = customerAppointments(customer, appointments)
  const selectedAppointment = appointmentId
    ? linkedAppointments.find((appointment) => appointment.id === appointmentId)
    : undefined

  if (selectedAppointment) {
    return (
      <AppointmentDetailPage
        appointment={selectedAppointment}
        onBack={onBackAppointment}
      />
    )
  }

  const appointmentTotal = linkedAppointments.reduce((sum, appointment) => sum + (appointment.amount || 0), 0)
  const serviceName = customer.serviceType ? serviceLabels[customer.serviceType] : '未设置项目'

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    setPhotoBusy(true)
    try {
      const addedPhotos = await Promise.all(files.map(preparePhoto))
      const nextPhotos = Array.from(new Set([...photos, ...addedPhotos]))
      await db.customers.update(customer.id, {
        photoDataUrl: nextPhotos[0],
        photoDataUrls: nextPhotos
      })
      notify(`已添加 ${addedPhotos.length} 张客户照片`)
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
    <section className="page customer-detail-page">
      <header className="detail-page-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回登记列表" title="返回">
          <ArrowLeft size={20} />
        </button>
        <div><p>CLIENT DETAIL</p><h1>用户详情</h1></div>
        <span className={`service-tag ${customer.serviceType || 'legacy'}`}>{serviceName}</span>
      </header>

      <section className="detail-summary-panel surface" aria-label="用户资料总览">
        <div className="customer-detail-hero">
          {photos[0] ? (
            <img src={photos[0]} alt={`${customer.name}的客户照片`} />
          ) : (
            <span className="customer-detail-avatar" aria-hidden="true"><UserRound size={30} /></span>
          )}
          <div>
            <h2>{customer.name}</h2>
            <p>{customer.wechatId || '未填写微信号'}</p>
          </div>
        </div>

        <div className="detail-info-grid customer-detail-info" aria-label="用户资料">
          <DetailItem icon={Phone} label="联系电话" value={customer.phone || '未填写'} />
          <DetailItem icon={CalendarDays} label="修复日期" value={customer.repairDate || '未设置'} />
          <DetailItem icon={WalletCards} label="预约总额" value={currency.format(appointmentTotal || customer.amount || 0)} />
          <DetailItem icon={Clock3} label="服务次数" value={`${linkedAppointments.length || customer.sessions || 0} 次`} />
        </div>

        <div className="detail-notes">
          <header><MessageCircle size={17} /><h2>登记备注</h2></header>
          <p className={customer.skinNotes ? '' : 'empty'}>{customer.skinNotes || '无备注'}</p>
        </div>
      </section>

      <section className="detail-gallery-section" aria-label="客户照片库">
        <header className="detail-section-heading">
          <div><h2>客户照片</h2><p>{photos.length ? `共 ${photos.length} 张` : '还没有客户照片'}</p></div>
          <label className={`secondary-button detail-photo-picker${photoBusy ? ' disabled' : ''}`}>
            <input className="visually-hidden-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={photoBusy} />
            <ImagePlus size={17} />{photoBusy ? '处理中...' : '添加照片'}
          </label>
        </header>

        {photos.length ? (
          <div className="detail-photo-grid">
            {photos.map((photo, index) => (
              <button type="button" key={`${photo.slice(-24)}-${index}`} onClick={() => setViewerIndex(index)} aria-label={`查看第 ${index + 1} 张客户照片大图`}>
                <img src={photo} alt={`${customer.name}的客户照片 ${index + 1}`} />
                <span><Maximize2 size={16} /></span>
              </button>
            ))}
          </div>
        ) : (
          <label className="detail-photo-empty surface">
            <input className="visually-hidden-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={photoBusy} />
            <ImagePlus size={25} />
            <strong>{photoBusy ? '正在处理照片...' : '添加客户照片'}</strong>
            <span>可一次选择多张，预约完成后也能继续添加</span>
          </label>
        )}
      </section>

      <section className="customer-appointments-section">
        <header className="detail-section-heading">
          <div><h2>预约记录</h2><p>共 {linkedAppointments.length} 条</p></div>
        </header>
        {linkedAppointments.length ? (
          <div className="customer-appointment-list">
            {linkedAppointments.map((appointment) => {
              const scheduledAt = new Date(appointment.scheduledAt)
              const appointmentService = appointment.appointmentType
                ? serviceLabels[appointment.appointmentType]
                : appointment.serviceName
              return (
                <button className="customer-appointment-row surface" type="button" key={appointment.id} onClick={() => onOpenAppointment(appointment.id)}>
                  <time dateTime={appointment.scheduledAt}>
                    <strong>{format(scheduledAt, 'd')}</strong>
                    <span>{format(scheduledAt, 'M月')}</span>
                  </time>
                  <span className="customer-appointment-copy">
                    <strong>{appointmentService || '未设置项目'}</strong>
                    <small>{format(scheduledAt, 'yyyy年M月d日 EEEE HH:mm', { locale: zhCN })}</small>
                  </span>
                  <span className={`status-badge ${appointment.status}`}>{statusLabels[appointment.status]}</span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="customer-appointments-empty surface">
            <CalendarDays size={22} />
            <div><strong>暂无关联预约</strong><p>使用同一微信号新增预约后会显示在这里</p></div>
          </div>
        )}
      </section>

      <PhotoLightbox
        name={customer.name}
        photos={photos}
        activeIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onPrevious={showPrevious}
        onNext={showNext}
      />
    </section>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <article className="detail-info-item">
      <span><Icon size={18} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  )
}
