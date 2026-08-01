import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CuteIcon, type CuteIconName } from '../components/CuteIcon'
import type { Appointment, AppointmentService, AppointmentStatus } from '../types'

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
  onBack: () => void
}

export function AppointmentDetailPage({ appointment, onBack }: AppointmentDetailPageProps) {
  const scheduledAt = new Date(appointment.scheduledAt)
  const name = appointment.nickname || appointment.customerName
  const serviceName = appointment.appointmentType
    ? serviceLabels[appointment.appointmentType]
    : appointment.serviceName

  return (
    <section className="page appointment-detail-page">
      <header className="detail-page-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回预约列表" title="返回">
          <CuteIcon name="back" size={20} />
        </button>
        <div>
          <p>APPOINTMENT DETAIL</p>
          <h1>预约详情</h1>
        </div>
        <span className={`status-badge ${appointment.status}`}>{statusLabels[appointment.status]}</span>
      </header>

      <section className="detail-summary-panel surface" aria-label="预约资料总览">
        <div className="detail-identity">
          <span className="detail-avatar"><CuteIcon name="user" size={26} /></span>
          <div>
            <h2>{name}</h2>
            <p>{appointment.wechatId || '未填写微信号'}</p>
          </div>
        </div>

        <div className="detail-info-grid" aria-label="预约信息">
          <DetailItem icon="calendar" label="预约日期" value={format(scheduledAt, 'yyyy年M月d日 EEEE', { locale: zhCN })} />
          <DetailItem icon="clock" label="预约时间" value={format(scheduledAt, 'HH:mm')} />
          <DetailItem icon="service" label="预约项目" value={serviceName || '未设置'} />
          <DetailItem icon="wallet" label="预约金额" value={appointment.amount ? currency.format(appointment.amount) : '未记账'} />
        </div>

        <div className="detail-notes">
          <header><CuteIcon name="note" size={17} /><h2>备注</h2></header>
          <p className={appointment.notes ? '' : 'empty'}>{appointment.notes || '无备注'}</p>
        </div>

        {appointment.cancelReason ? (
          <div className="detail-cancel-reason" aria-label="取消原因">
            <strong>取消原因</strong>
            <p>{appointment.cancelReason}</p>
          </div>
        ) : null}
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
