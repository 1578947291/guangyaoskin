import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import type { AppointmentStatus, Notify } from '../types'

const statusLabels: Record<AppointmentStatus, string> = {
  upcoming: '待服务',
  completed: '已完成',
  cancelled: '已取消'
}

function defaultDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

interface AppointmentsPageProps {
  notify: Notify
}

export function AppointmentsPage({ notify }: AppointmentsPageProps) {
  const appointments = useLiveQuery(() => db.appointments.orderBy('scheduledAt').toArray(), []) ?? []
  const [open, setOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime)
  const [notes, setNotes] = useState('')

  const close = () => setOpen(false)
  const reset = () => {
    setCustomerName('')
    setPhone('')
    setServiceName('')
    setScheduledAt(defaultDateTime())
    setNotes('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await db.appointments.add({
      id: crypto.randomUUID(),
      customerName: customerName.trim(),
      phone: phone.trim(),
      serviceName: serviceName.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes.trim(),
      status: 'upcoming',
      createdAt: new Date().toISOString()
    })
    reset()
    close()
    notify('预约已保存')
  }

  const remove = async (id: string) => {
    if (!window.confirm('确定删除这条预约吗？')) return
    await db.appointments.delete(id)
    notify('预约已删除')
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="SCHEDULE"
        title="预约"
        subtitle="安排每一次护理与回访"
        action={<button className="action-button" type="button" onClick={() => setOpen(true)}><Plus size={17} />新增</button>}
      />

      <section className="status-strip surface" aria-label="预约统计">
        <StatusCount label="待服务" value={appointments.filter((item) => item.status === 'upcoming').length} tone="coral" />
        <StatusCount label="已完成" value={appointments.filter((item) => item.status === 'completed').length} tone="teal" />
        <StatusCount label="全部" value={appointments.length} tone="gold" />
      </section>

      {appointments.length === 0 ? (
        <EmptyState icon={CalendarPlus} title="还没有预约" message="点击右上角添加第一条预约" />
      ) : (
        <div className="record-list">
          {appointments.map((appointment) => {
            const date = new Date(appointment.scheduledAt)
            return (
              <article className="record-row surface" key={appointment.id}>
                <time className="date-tile" dateTime={appointment.scheduledAt}>
                  <strong>{date.getDate()}</strong>
                  <span>{date.getMonth() + 1}月</span>
                </time>
                <div className="record-copy">
                  <div className="record-title-line">
                    <h2>{appointment.customerName}</h2>
                    <select
                      className={`status-select ${appointment.status}`}
                      aria-label={`${appointment.customerName}的预约状态`}
                      value={appointment.status}
                      onChange={(event) => db.appointments.update(appointment.id, { status: event.target.value as AppointmentStatus })}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <p>{appointment.serviceName}</p>
                  <small>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)}{appointment.phone ? ` · ${appointment.phone}` : ''}</small>
                </div>
                <button className="danger-icon-button" type="button" onClick={() => remove(appointment.id)} aria-label="删除预约" title="删除预约"><Trash2 size={17} /></button>
              </article>
            )
          })}
        </div>
      )}

      <Modal title="新增预约" open={open} onClose={close}>
        <form className="data-form" onSubmit={submit}>
          <label>顾客姓名<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" /></label>
          <label>手机号<input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
          <label>护理项目<input required value={serviceName} onChange={(event) => setServiceName(event.target.value)} /></label>
          <label>预约时间<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label className="full-field">备注<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label>
          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={close}>取消</button>
            <button className="primary-button" type="submit">保存预约</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function StatusCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><strong className={tone}>{value}</strong><span>{label}</span></div>
}
