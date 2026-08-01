import { useLiveQuery } from 'dexie-react-hooks'
import {
  Banknote,
  CalendarDays,
  Check,
  CircleX,
  UserRound,
  UsersRound,
  type LucideIcon
} from 'lucide-react'
import { db } from '../db'
import type { Appointment, AppointmentService, CustomerRecord, Notify } from '../types'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0
})

const repairDateFormat = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short'
})

const todayDateFormat = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})

const motivationalMessages = [
  { title: '今天，也要从容发光', subtitle: '重要安排与经营情况，一眼就能掌握' },
  { title: '把每一次认真，变成温柔的光', subtitle: '按照自己的节奏，把今天过得漂亮' },
  { title: '心有方向，脚步自然坚定', subtitle: '每一份用心，都在为更好的未来积累答案' },
  { title: '不慌不忙，也能抵达远方', subtitle: '看清今天的安排，专注做好眼前的事' },
  { title: '保持热爱，静待花开', subtitle: '稳稳经营每一天，好状态自然会到来' },
  { title: '认真生活，自有光芒', subtitle: '把今天照顾好，就是给明天最好的准备' }
] as const

function selectOpeningMessage() {
  const fallbackIndex = Math.floor(Math.random() * motivationalMessages.length)
  if (typeof window === 'undefined') return motivationalMessages[fallbackIndex]

  try {
    const storageKey = 'guangyao-home-message-index'
    const previousIndex = Number(window.localStorage.getItem(storageKey))
    let nextIndex = fallbackIndex
    if (motivationalMessages.length > 1 && nextIndex === previousIndex) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (motivationalMessages.length - 1))) % motivationalMessages.length
    }
    window.localStorage.setItem(storageKey, String(nextIndex))
    return motivationalMessages[nextIndex]
  } catch {
    return motivationalMessages[fallbackIndex]
  }
}

const openingMessage = selectOpeningMessage()

const serviceLabels: Record<AppointmentService, string> = {
  experience: '体验',
  'full-face': '全脸'
}

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
}

function customerKey(wechatId: string | undefined, name: string) {
  return (wechatId || name).trim().toLocaleLowerCase('zh-CN')
}

function formatRepairDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : repairDateFormat.format(date)
}

function dateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function linkedAppointment(customer: CustomerRecord, appointments: Appointment[]) {
  const linked = customer.appointmentId
    ? appointments.find((appointment) => appointment.id === customer.appointmentId)
    : undefined
  if (linked) return linked
  if (!customer.repairDate) return undefined

  const key = customerKey(customer.wechatId, customer.name)
  return appointments
    .filter((appointment) =>
      appointment.status === 'upcoming' &&
      dateKey(appointment.scheduledAt) === customer.repairDate &&
      customerKey(appointment.wechatId, appointment.customerName) === key
    )
    .sort((first, second) => second.scheduledAt.localeCompare(first.scheduledAt))[0]
}

interface HomePageProps {
  notify: Notify
}

export function HomePage({ notify }: HomePageProps) {
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? []
  const entries = useLiveQuery(() => db.ledgerEntries.toArray(), []) ?? []
  const today = new Date()

  const todayAppointments = appointments.filter((appointment) =>
    appointment.status !== 'cancelled' && isSameDay(new Date(appointment.scheduledAt), today)
  )
  const todayAppointmentIds = new Set(todayAppointments.map((appointment) => appointment.id))
  const todayIncome = entries
    .filter((entry) => entry.kind === 'income' && entry.appointmentId && todayAppointmentIds.has(entry.appointmentId))
    .reduce((sum, entry) => sum + entry.amount, 0)
  const todayCustomers = new Set(
    todayAppointments.map((appointment) => customerKey(appointment.wechatId, appointment.customerName))
  ).size

  const pendingRepairs = customers
    .filter((customer) => customer.repairDate && (!customer.repairStatus || customer.repairStatus === 'pending'))
    .sort((first, second) => (first.repairDate || '').localeCompare(second.repairDate || ''))

  const updateRepair = async (customer: CustomerRecord, status: 'completed' | 'cancelled') => {
    const appointment = linkedAppointment(customer, appointments)
    await db.transaction('rw', db.customers, db.appointments, async () => {
      await db.customers.update(customer.id, status === 'completed'
        ? { repairStatus: status, lastVisitAt: new Date().toISOString() }
        : { repairStatus: status })
      if (appointment) {
        await db.appointments.update(appointment.id, { status })
      }
    })
  }

  const completeRepair = async (customer: CustomerRecord) => {
    await updateRepair(customer, 'completed')
    notify('已标记为修复完成，预约状态已同步')
  }

  const cancelRepair = async (customer: CustomerRecord) => {
    if (!window.confirm('确定取消这位客人的修复安排吗？')) return
    await updateRepair(customer, 'cancelled')
    notify('已取消修复安排，预约状态已同步')
  }

  return (
    <section className="page home-page">
      <section className="home-overview" aria-label="今日概览">
        <header className="home-greeting">
          <p className="home-date">{todayDateFormat.format(today)}</p>
          <h1>{openingMessage.title}</h1>
          <p className="home-greeting-copy">{openingMessage.subtitle}</p>
        </header>
        <div className="metrics-grid home-metrics" aria-label="今日经营数据">
          <Metric title="今日客人数" value={String(todayCustomers)} suffix="位" icon={UsersRound} tone="teal" />
          <Metric title="今日收入" value={currency.format(todayIncome)} icon={Banknote} tone="gold" compact />
        </div>
      </section>

      <section className="repair-section">
        <header className="repair-heading">
          <div>
            <p>REPAIR SCHEDULE</p>
            <h1>待修复客人</h1>
          </div>
          <span>{pendingRepairs.length} 位</span>
        </header>

        {pendingRepairs.length === 0 ? (
          <div className="repair-empty surface">
            <span className="round-icon teal"><CalendarDays size={20} /></span>
            <div><h2>暂无待修复客人</h2><p>新增登记或预约后，修复安排会显示在这里</p></div>
          </div>
        ) : (
          <div className="record-list repair-list">
            {pendingRepairs.map((customer) => {
              const serviceName = customer.serviceType ? serviceLabels[customer.serviceType] : '未设置项目'
              return (
                <article className="repair-card surface" key={customer.id}>
                  {customer.photoDataUrl ? (
                    <img className="repair-photo" src={customer.photoDataUrl} alt={`${customer.name}的照片`} />
                  ) : (
                    <span className="repair-photo placeholder" aria-hidden="true"><UserRound size={24} /></span>
                  )}
                  <div className="repair-copy">
                    <div className="record-title-line">
                      <h2>{customer.name}</h2>
                      <span className={`service-tag ${customer.serviceType || 'legacy'}`}>{serviceName}</span>
                    </div>
                    <p><CalendarDays size={14} />{formatRepairDate(customer.repairDate!)}</p>
                    <small>{customer.sessions ? `${customer.sessions} 次` : '次数未填写'}{customer.wechatId ? ` · ${customer.wechatId}` : ''}</small>
                  </div>
                  <div className="repair-actions">
                    <button className="repair-action complete" type="button" onClick={() => completeRepair(customer)}>
                      <Check size={16} />修复完成
                    </button>
                    <button className="repair-action cancel" type="button" onClick={() => cancelRepair(customer)}>
                      <CircleX size={16} />取消修复
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

interface MetricProps {
  title: string
  value: string
  suffix?: string
  icon: LucideIcon
  tone: 'teal' | 'gold'
  compact?: boolean
}

function Metric({ title, value, suffix, icon: Icon, tone, compact }: MetricProps) {
  return (
    <article className="metric home-metric surface">
      <div className="metric-top">
        <span className={`round-icon ${tone}`}><Icon size={17} /></span>
        <span>{title}</span>
      </div>
      <p className={compact ? 'compact-value' : ''}>
        <strong>{value}</strong>{suffix ? <small>{suffix}</small> : null}
      </p>
    </article>
  )
}
