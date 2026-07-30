import { useLiveQuery } from 'dexie-react-hooks'
import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  CircleDollarSign,
  Sparkles,
  TrendingUp,
  UserPlus,
  UsersRound,
  type LucideIcon
} from 'lucide-react'
import { PageHeader } from '../components/PageElements'
import { db } from '../db'
import type { AppSection } from '../types'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0
})

const fullDate = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
}

interface HomePageProps {
  onNavigate: (section: AppSection) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const appointments = useLiveQuery(() => db.appointments.orderBy('scheduledAt').toArray(), []) ?? []
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? []
  const entries = useLiveQuery(() => db.ledgerEntries.toArray(), []) ?? []
  const now = new Date()

  const todayAppointments = appointments.filter((item) =>
    item.status === 'upcoming' && isSameDay(new Date(item.scheduledAt), now)
  )
  const pendingCount = appointments.filter((item) => item.status === 'upcoming').length
  const nextAppointment = appointments.find((item) =>
    item.status === 'upcoming' && new Date(item.scheduledAt) >= now
  )
  const monthlyBalance = entries
    .filter((item) => {
      const date = new Date(item.occurredAt)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })
    .reduce((sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount), 0)

  return (
    <section className="page home-page">
      <PageHeader
        eyebrow={fullDate.format(now)}
        title="今天，也要从容发光"
        subtitle="重要安排与经营情况，一眼就能掌握"
      />

      <div className="metrics-grid">
        <Metric title="今日预约" value={String(todayAppointments.length)} suffix="单" icon={CalendarClock} tone="coral" />
        <Metric title="顾客档案" value={String(customers.length)} suffix="位" icon={UsersRound} tone="teal" />
        <Metric title="本月结余" value={currency.format(monthlyBalance)} icon={TrendingUp} tone="gold" compact />
        <Metric title="待服务" value={String(pendingCount)} suffix="项" icon={Sparkles} tone="teal" />
      </div>

      <section className="upcoming surface">
        <header className="section-heading">
          <h2>下一项预约</h2>
          <button className="text-button" type="button" onClick={() => onNavigate('appointments')}>全部</button>
        </header>
        {nextAppointment ? (
          <button className="upcoming-row" type="button" onClick={() => onNavigate('appointments')}>
            <time dateTime={nextAppointment.scheduledAt}>
              <strong>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(nextAppointment.scheduledAt))}</strong>
              <span>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(nextAppointment.scheduledAt))}</span>
            </time>
            <span className="upcoming-copy">
              <strong>{nextAppointment.customerName}</strong>
              <small>{nextAppointment.serviceName}</small>
            </span>
            <ChevronRight size={18} />
          </button>
        ) : (
          <div className="quiet-row"><CalendarPlus size={18} /><span>暂无待服务预约</span></div>
        )}
      </section>

      <section className="quick-section">
        <h2>快捷入口</h2>
        <div className="quick-grid">
          <QuickAction label="新增预约" icon={CalendarPlus} tone="coral" onClick={() => onNavigate('appointments')} />
          <QuickAction label="顾客登记" icon={UserPlus} tone="teal" onClick={() => onNavigate('registration')} />
          <QuickAction label="记录收支" icon={CircleDollarSign} tone="gold" onClick={() => onNavigate('finance')} />
        </div>
      </section>
    </section>
  )
}

interface MetricProps {
  title: string
  value: string
  suffix?: string
  icon: LucideIcon
  tone: 'coral' | 'teal' | 'gold'
  compact?: boolean
}

function Metric({ title, value, suffix, icon: Icon, tone, compact }: MetricProps) {
  return (
    <article className="metric surface">
      <div className="metric-top">
        <span className={`round-icon ${tone}`}><Icon size={15} /></span>
        <span>{title}</span>
      </div>
      <p className={compact ? 'compact-value' : ''}>
        <strong>{value}</strong>{suffix ? <small>{suffix}</small> : null}
      </p>
    </article>
  )
}

interface QuickActionProps {
  label: string
  icon: LucideIcon
  tone: 'coral' | 'teal' | 'gold'
  onClick: () => void
}

function QuickAction({ label, icon: Icon, tone, onClick }: QuickActionProps) {
  return (
    <button className="quick-action surface" type="button" onClick={onClick}>
      <span className={`round-icon ${tone}`}><Icon size={18} /></span>
      <span>{label}</span>
    </button>
  )
}
