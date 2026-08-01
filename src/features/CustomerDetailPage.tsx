import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CuteIcon, type CuteIconName } from '../components/CuteIcon'
import { db } from '../db'
import { customerAppointments } from '../lib/customerAppointments'
import { customerPhotos } from '../lib/customerPhotos'
import type { AppointmentService, AppointmentStatus, CustomerRecord } from '../types'
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
  appointmentId?: string
  onBack: () => void
  onOpenAppointment: (appointmentId: string) => void
  onOpenPhotos: () => void
  onBackAppointment: () => void
}

export function CustomerDetailPage({
  customer,
  appointmentId,
  onBack,
  onOpenAppointment,
  onOpenPhotos,
  onBackAppointment
}: CustomerDetailPageProps) {
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const photos = customerPhotos(customer)
  const previewPhotos = photos.slice(0, 2)
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

  return (
    <section className="page customer-detail-page">
      <header className="detail-page-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回登记列表" title="返回">
          <CuteIcon name="back" size={20} />
        </button>
        <div><p>CLIENT DETAIL</p><h1>用户详情</h1></div>
        <span className={`service-tag ${customer.serviceType || 'legacy'}`}>{serviceName}</span>
      </header>

      <section className="detail-summary-panel surface" aria-label="用户资料总览">
        <div className="customer-detail-hero">
          {photos[0] ? (
            <img src={photos[0]} alt={`${customer.name}的客户照片`} />
          ) : (
            <span className="customer-detail-avatar" aria-hidden="true"><CuteIcon name="user" size={30} /></span>
          )}
          <div>
            <h2>{customer.name}</h2>
            <p>{customer.wechatId || '未填写微信号'}</p>
          </div>
        </div>

        <div className="detail-info-grid customer-detail-info" aria-label="用户资料">
          <DetailItem icon="phone" label="联系电话" value={customer.phone || '未填写'} />
          <DetailItem icon="calendar" label="修复日期" value={customer.repairDate || '未设置'} />
          <DetailItem icon="wallet" label="预约总额" value={currency.format(appointmentTotal || customer.amount || 0)} />
          <DetailItem icon="clock" label="服务次数" value={`${linkedAppointments.length || customer.sessions || 0} 次`} />
        </div>

        <div className="detail-notes">
          <header><CuteIcon name="note" size={17} /><h2>登记备注</h2></header>
          <p className={customer.skinNotes ? '' : 'empty'}>{customer.skinNotes || '无备注'}</p>
        </div>
      </section>

      <button className="customer-photo-preview-module surface" type="button" onClick={onOpenPhotos} aria-label="打开客户照片管理">
        <span className="customer-photo-preview-heading">
          <span><CuteIcon name="images" size={19} /></span>
          <span><strong>客户照片</strong><small>{photos.length ? `共 ${photos.length} 张` : '还没有客户照片'}</small></span>
          <span>管理<CuteIcon name="right" size={18} /></span>
        </span>
        {previewPhotos.length ? (
          <span className="customer-photo-preview-grid">
            {previewPhotos.map((photo, index) => (
              <span className="customer-photo-preview-item" key={`${photo.slice(-24)}-${index}`}>
                <img src={photo} alt={`${customer.name}的客户照片预览 ${index + 1}`} />
                {index === 1 && photos.length > 2 ? <span className="customer-photo-overflow">+{photos.length - 2}</span> : null}
              </span>
            ))}
          </span>
        ) : (
          <span className="customer-photo-preview-empty"><CuteIcon name="images" size={23} /><span>进入照片管理添加照片</span></span>
        )}
      </button>

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
                  <CuteIcon name="right" size={18} />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="customer-appointments-empty surface">
            <CuteIcon name="calendar" size={22} />
            <div><strong>暂无关联预约</strong><p>使用同一微信号新增预约后会显示在这里</p></div>
          </div>
        )}
      </section>

    </section>
  )
}

function DetailItem({ icon, label, value }: { icon: CuteIconName; label: string; value: string }) {
  return (
    <article className="detail-info-item">
      <span><CuteIcon name={icon} size={18} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  )
}
