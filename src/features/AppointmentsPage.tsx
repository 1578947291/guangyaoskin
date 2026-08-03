import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addHours, format, isSameDay, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import { CuteIcon } from '../components/CuteIcon'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import { AppointmentDetailPage } from './AppointmentDetailPage'
import {
  consumeCustomerBalance,
  customerBookedSessions,
  customerOutstandingBalance,
  customerRemainingSessions,
  restoreCustomerBalance
} from '../lib/customerBalance'
import { customerPhotos } from '../lib/customerPhotos'
import { createId } from '../lib/id'
import type { AppointmentService, AppointmentStatus, Notify } from '../types'

/**
 * 预约页面
 */
const statusLabels: Record<AppointmentStatus, string> = {
  upcoming: '待服务',
  completed: '已完成',
  cancelled: '已取消'
}

const statusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  upcoming: ['upcoming', 'completed', 'cancelled'],
  completed: ['completed', 'cancelled'],
  cancelled: ['cancelled']
}

const serviceLabels: Record<AppointmentService, string> = {
  experience: '体验',
  'full-face': '全脸修复'
}

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

function defaultTime() {
  return format(addHours(new Date(), 1), 'HH:mm')
}

function appointmentName(appointment: { nickname?: string; customerName: string }) {
  return appointment.nickname || appointment.customerName
}

interface AppointmentsPageProps {
  notify: Notify
  appointmentId?: string
  onOpenAppointment: (appointmentId: string) => void
  onOpenRegistration: () => void
  onBack: () => void
}

export function AppointmentsPage({ notify, appointmentId, onOpenAppointment, onOpenRegistration, onBack }: AppointmentsPageProps) {
  const appointments = useLiveQuery(() => db.appointments.orderBy('scheduledAt').toArray(), []) ?? []
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) ?? []
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => startOfDay(new Date()))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [appointmentType, setAppointmentType] = useState<AppointmentService>('experience')
  const [notes, setNotes] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [appointmentTime, setAppointmentTime] = useState(defaultTime)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [sessionsUsed, setSessionsUsed] = useState('1')
  const [saving, setSaving] = useState(false)
  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const bookedDates = useMemo(
    () => appointments.map((appointment) => startOfDay(new Date(appointment.scheduledAt))),
    [appointments]
  )
  const appointmentsForDay = appointments.filter((appointment) =>
    isSameDay(new Date(appointment.scheduledAt), selectedDate)
  )
  const customersById = new Map(customers.map((customer) => [customer.id, customer]))
  const customerSearchKeyword = customerSearch.trim().toLocaleLowerCase('zh-CN')
  const filteredCustomers = customerSearchKeyword
    ? customers.filter((customer) =>
        [
          customer.name,
          customer.phone,
          customer.wechatId || '',
          customerOutstandingBalance(customer).toString(),
          customerRemainingSessions(customer).toString()
        ].some((value) => value.toLocaleLowerCase('zh-CN').includes(customerSearchKeyword))
      )
    : customers

  const reset = () => {
    setSelectedCustomerId('')
    setCustomerSearch('')
    setAppointmentType('experience')
    setNotes('')
    setAppointmentDate(format(selectedDate, 'yyyy-MM-dd'))
    setAppointmentTime(defaultTime())
    setPaymentAmount('')
    setSessionsUsed('1')
  }
  const close = () => {
    setOpen(false)
    reset()
  }
  const openForm = () => {
    if (!customers.length) {
      notify('请先登记客户，再创建预约')
      onOpenRegistration()
      return
    }
    setAppointmentDate(format(selectedDate, 'yyyy-MM-dd'))
    setOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const member = customersById.get(selectedCustomerId)
    if (!member) {
      notify('请选择已登记客户')
      return
    }
    const amount = Number(paymentAmount)
    const sessionCount = Number(sessionsUsed)
    if (!Number.isFinite(amount) || amount < 0) {
      notify('请输入正确的本次收款金额')
      return
    }
    if (amount > customerOutstandingBalance(member)) {
      notify('本次收款不能超过客户还需支付的尾款')
      return
    }
    if (!Number.isInteger(sessionCount) || sessionCount <= 0) {
      notify('请输入正确的本次修复次数')
      return
    }
    if (sessionCount > customerRemainingSessions(member)) {
      notify('本次修复次数不能超过客户剩余次数')
      return
    }
    const scheduledDate = new Date(`${appointmentDate}T${appointmentTime}`)
    if (Number.isNaN(scheduledDate.getTime())) {
      notify('请选择正确的预约日期和时间')
      return
    }

    const appointmentId = createId()
    const createdAt = new Date().toISOString()
    const serviceName = serviceLabels[appointmentType]
    const memberName = member.name
    const memberWechatId = member.wechatId || ''
    setSaving(true)
    try {
      await db.transaction('rw', db.appointments, db.ledgerEntries, db.customers, async () => {
        await db.appointments.add({
          id: appointmentId,
          customerId: member.id,
          customerName: memberName,
          phone: member.phone,
          serviceName,
          scheduledAt: scheduledDate.toISOString(),
          notes: notes.trim(),
          status: 'upcoming',
          createdAt,
          nickname: memberName,
          wechatId: memberWechatId,
          appointmentType,
          amount,
          sessionsUsed: sessionCount
        })
        if (amount > 0) {
          await db.ledgerEntries.add({
            id: createId(),
            title: `预约${serviceName}`,
            amount,
            kind: 'income',
            occurredAt: scheduledDate.toISOString(),
            notes: `${memberName} · ${format(scheduledDate, 'M月d日 HH:mm')}`,
            createdAt,
            appointmentId
          })
        }

        await db.customers.update(member.id, {
          appointmentId,
          ...consumeCustomerBalance(member, amount, sessionCount),
          repairDate: appointmentDate,
          repairStatus: 'pending'
        })
      })

      setSelectedDate(startOfDay(scheduledDate))
      setCalendarMonth(startOfDay(scheduledDate))
      close()
      notify(`已为${memberName}创建预约并扣减尾款 ${currency.format(amount)}`)
    } catch {
      notify('预约保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    const appointment = await db.appointments.get(id)
    if (appointment?.status === 'completed') {
      notify('已完成预约不可删除')
      return
    }
    if (!window.confirm('确定删除这条预约吗？对应的收支记录会保留。')) return
    await db.transaction('rw', db.appointments, db.customers, async () => {
      await db.appointments.delete(id)
      if (appointment?.customerId) {
        const member = await db.customers.get(appointment.customerId)
        if (member) {
          await db.customers.update(member.id, {
            ...restoreCustomerBalance(member, appointment.amount || 0, appointment.sessionsUsed || 1),
            ...(member.appointmentId === appointment.id ? { repairStatus: 'cancelled' } : {})
          })
        }
      }
    })
    notify('预约已删除，收支记录已保留')
  }

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    const appointment = await db.appointments.get(id)
    if (!appointment) return
    if (!statusTransitions[appointment.status].includes(status)) {
      notify('已取消预约不可更改状态')
      return
    }
    if (status === 'cancelled') {
      setCancelAppointmentId(id)
      setCancelReason(appointment.cancelReason || '')
      return
    }
    await db.appointments.update(id, { status, cancelReason: undefined })
  }

  const closeCancelDialog = () => {
    setCancelAppointmentId(null)
    setCancelReason('')
  }

  const confirmCancellation = async (event: FormEvent) => {
    event.preventDefault()
    const reason = cancelReason.trim()
    if (!cancelAppointmentId || !reason) {
      notify('请填写取消原因')
      return
    }
    const appointment = await db.appointments.get(cancelAppointmentId)
    await db.transaction('rw', db.appointments, db.customers, async () => {
      await db.appointments.update(cancelAppointmentId, { status: 'cancelled', cancelReason: reason })
      if (appointment?.customerId) {
        const member = await db.customers.get(appointment.customerId)
        if (member) {
          await db.customers.update(member.id, {
            ...restoreCustomerBalance(member, appointment.amount || 0, appointment.sessionsUsed || 1),
            ...(member.appointmentId === appointment.id ? { repairStatus: 'cancelled' } : {})
          })
        }
      }
    })
    closeCancelDialog()
    notify('预约已取消，尾款和次数已恢复')
  }

  const detailAppointment = appointmentId
    ? appointments.find((appointment) => appointment.id === appointmentId)
    : undefined

  if (detailAppointment) {
    return <AppointmentDetailPage appointment={detailAppointment} onBack={onBack} />
  }

  return (
    <section className="page appointments-page">
      <PageHeader
        eyebrow=""
        title="预约"
        subtitle="按日期安排护理与服务"
        action={<button className="action-button" type="button" onClick={openForm}><CuteIcon name="plus" size={17} />新增</button>}
      />

      <section className={`calendar-panel surface${calendarOpen ? ' expanded' : ' collapsed'}`} aria-label="预约日历">
        <button
          className="calendar-toggle"
          type="button"
          aria-expanded={calendarOpen}
          aria-controls="appointment-calendar-content"
          onClick={() => setCalendarOpen((current) => !current)}
        >
          <span className="round-icon coral"><CuteIcon name="calendar" size={17} /></span>
          <span className="calendar-toggle-copy"><small>{calendarOpen ? '收起日历' : '展开日历'}</small><strong>{format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}</strong></span>
          <CuteIcon className="calendar-toggle-icon" name="down" size={19} />
        </button>
        {calendarOpen ? (
          <div className="calendar-content" id="appointment-calendar-content">
            <DayPicker
              animate
              className="appointment-calendar"
              fixedWeeks
              locale={zhCN}
              mode="single"
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => {
                if (!date) return
                setSelectedDate(startOfDay(date))
                setCalendarOpen(false)
              }}
              selected={selectedDate}
              showOutsideDays
              weekStartsOn={1}
              modifiers={{ hasAppointment: bookedDates }}
              modifiersClassNames={{ hasAppointment: 'has-appointment' }}
              components={{
                Chevron: ({ className, orientation }) => {
                  return <CuteIcon className={className} name={orientation === 'left' ? 'left' : 'right'} size={18} />
                }
              }}
            />
            <div className="calendar-legend"><span aria-hidden="true" />有预约日期</div>
          </div>
        ) : null}
      </section>

      <section className="day-summary">
        <div>
          <p>{format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}</p>
          <h2>当日预约</h2>
        </div>
        <button className="secondary-button compact-button" type="button" onClick={() => {
          const today = startOfDay(new Date())
          setSelectedDate(today)
          setCalendarMonth(today)
        }}>今天</button>
      </section>

      <section className="status-strip surface" aria-label="当日预约统计">
        <StatusCount label="待服务" value={appointmentsForDay.filter((item) => item.status === 'upcoming').length} tone="coral" />
        <StatusCount label="已完成" value={appointmentsForDay.filter((item) => item.status === 'completed').length} tone="teal" />
        <StatusCount label="当日全部" value={appointmentsForDay.length} tone="gold" />
      </section>

      {appointmentsForDay.length === 0 ? (
        <EmptyState icon="calendar" title="当天没有预约" message="选择其他日期，或点击右上角新增预约" />
      ) : (
        <section className="appointment-table" aria-label="当日预约列表">
          <div className="appointment-list-header" aria-hidden="true">
            <span>时间</span><span>昵称</span><span>项目</span><span>金额</span><span>照片</span><span>备注</span><span>取消原因</span><span>状态</span>
          </div>
          <div className="record-list appointment-list">
            {appointmentsForDay.map((appointment) => {
              const date = new Date(appointment.scheduledAt)
              const name = appointmentName(appointment)
              const serviceName = appointment.appointmentType
                ? serviceLabels[appointment.appointmentType]
                : appointment.serviceName || '修复'
              const linkedCustomer = appointment.customerId
                ? customersById.get(appointment.customerId)
                : customers.find((customer) => normalizeIdentity(customer.wechatId) === normalizeIdentity(appointment.wechatId))
              const photos = linkedCustomer ? customerPhotos(linkedCustomer) : []
              return (
                <article className={`appointment-card surface ${appointment.status}`} key={appointment.id}>
                  <button className="appointment-detail-hitarea" type="button" onClick={() => onOpenAppointment(appointment.id)} aria-label={`查看${name}的预约详情`} />
                  <time className="appointment-time" dateTime={appointment.scheduledAt}>{format(date, 'HH:mm')}</time>
                  <strong className="appointment-name" title={name}>{name}</strong>
                  <span className={`service-tag ${appointment.appointmentType || 'legacy'}`}>{serviceName}</span>
                  <strong className="appointment-amount">{appointment.amount ? currency.format(appointment.amount) : '未记账'}</strong>
                  {photos[0] ? (
                    <span className="appointment-photo-wrap">
                      <img className="appointment-photo" src={photos[0]} alt={`${name}的预约照片`} />
                      {photos.length > 1 ? <small>{photos.length}</small> : null}
                    </span>
                  ) : (
                    <span className="appointment-photo placeholder" aria-label="无照片"><CuteIcon name="user" size={20} /></span>
                  )}
                  <p className={`appointment-notes${appointment.notes ? '' : ' empty'}`} title={appointment.notes || '无备注'}>{appointment.notes || '无备注'}</p>
                  <p className={`appointment-cancel-reason${appointment.cancelReason ? '' : ' empty'}`} title={appointment.cancelReason || '无'}>{appointment.cancelReason || '无'}</p>
                  <div className="appointment-actions">
                    {appointment.status === 'cancelled' ? (
                      <>
                        <span className="status-badge cancelled" aria-label={`${name}的预约状态：已取消`}>已取消</span>
                        <button className="danger-icon-button" type="button" onClick={() => remove(appointment.id)} aria-label="删除预约" title="删除预约"><CuteIcon name="delete" size={17} /></button>
                      </>
                    ) : (
                      <>
                        <select
                          className={`status-select ${appointment.status}`}
                          aria-label={`${name}的预约状态`}
                          value={appointment.status}
                          onChange={(event) => updateStatus(appointment.id, event.target.value as AppointmentStatus)}
                        >
                          {statusTransitions[appointment.status].map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
                        </select>
                        {appointment.status === 'upcoming' ? <button className="danger-icon-button" type="button" onClick={() => remove(appointment.id)} aria-label="删除预约" title="删除预约"><CuteIcon name="delete" size={17} /></button> : null}
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <Modal title="新增预约" open={open} onClose={close} className="appointment-modal">
        <form className="data-form appointment-form" onSubmit={submit} noValidate>
          <fieldset className="appointment-customer-picker full-field" id="appointment-customer">
            <legend>选择已登记客户</legend>
            <label className="appointment-customer-search" htmlFor="appointment-customer-search">
              <CuteIcon name="search" size={17} />
              <span className="sr-only">搜索客户</span>
              <input
                id="appointment-customer-search"
                type="search"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="搜索姓名、电话、微信号、尾款或次数"
              />
              {customerSearch ? <button type="button" onClick={() => setCustomerSearch('')} aria-label="清除客户搜索" title="清除客户搜索"><CuteIcon name="close" size={16} /></button> : null}
            </label>
            <div className="appointment-customer-options">
              {filteredCustomers.length ? filteredCustomers.map((customer) => {
                const photos = customerPhotos(customer)
                const selected = selectedCustomerId === customer.id
                return (
                  <label className={selected ? 'selected' : ''} key={customer.id}>
                    <input type="radio" name="appointment-customer" value={customer.id} checked={selected} onChange={() => setSelectedCustomerId(customer.id)} />
                    {photos[0] ? <img src={photos[0]} alt="" /> : <span className="appointment-customer-avatar" aria-hidden="true"><CuteIcon name="user" size={20} /></span>}
                    <span className="appointment-customer-copy">
                      <strong>{customer.name}</strong>
                      <small>{customer.phone || '未填写电话'}{customer.wechatId ? ` · ${customer.wechatId}` : ''}</small>
                      <small>已约 {customerBookedSessions(customer)} 次 · 剩余 {customerRemainingSessions(customer)} 次 · 尾款 {currency.format(customerOutstandingBalance(customer))}</small>
                    </span>
                    <span className="appointment-customer-check" aria-hidden="true"><CuteIcon name="check" size={16} /></span>
                  </label>
                )
              }) : (
                <div className="appointment-customer-empty">
                  <CuteIcon name="search" size={20} />
                  <span>没有匹配客户</span>
                </div>
              )}
            </div>
          </fieldset>
          <label htmlFor="appointment-date">预约日期<input id="appointment-date" required type="date" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} /></label>
          <label htmlFor="appointment-time">预约时间<input id="appointment-time" required type="time" value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} /></label>

          <fieldset className="segmented service-picker full-field">
            <legend>预约项目</legend>
            <label className={appointmentType === 'experience' ? 'active' : ''}>
              <input type="radio" name="appointment-type" value="experience" checked={appointmentType === 'experience'} onChange={() => setAppointmentType('experience')} />
              <span>体验</span><small>体验项目</small>
            </label>
            <label className={appointmentType === 'full-face' ? 'active' : ''}>
              <input type="radio" name="appointment-type" value="full-face" checked={appointmentType === 'full-face'} onChange={() => setAppointmentType('full-face')} />
              <span>全脸修复</span><small>正式修复</small>
            </label>
          </fieldset>

          <label htmlFor="appointment-amount">本次收款<input id="appointment-amount" required type="number" min="0" step="0.01" inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
          <label htmlFor="appointment-sessions-used">本次修复次数<input id="appointment-sessions-used" required type="number" min="1" step="1" inputMode="numeric" value={sessionsUsed} onChange={(event) => setSessionsUsed(event.target.value)} /></label>

          <label className="full-field" htmlFor="appointment-notes">备注（可选）<textarea id="appointment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="记录护理需求或其他说明" /></label>

          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={close}>取消</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? '正在保存...' : '保存预约并扣减'}</button>
          </div>
        </form>
      </Modal>

      <Modal title="填写取消原因" open={Boolean(cancelAppointmentId)} onClose={closeCancelDialog}>
        <form className="data-form cancel-reason-form" onSubmit={confirmCancellation} noValidate>
          <label className="full-field" htmlFor="appointment-cancel-reason">
            取消原因
            <textarea id="appointment-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={4} autoFocus placeholder="请填写本次取消修复的原因" />
          </label>
          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={closeCancelDialog}>返回</button>
            <button className="primary-button" type="submit">确认取消</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function StatusCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><strong className={tone}>{value}</strong><span>{label}</span></div>
}

function normalizeIdentity(value: string | undefined) {
  return (value || '').trim().toLocaleLowerCase('zh-CN')
}
