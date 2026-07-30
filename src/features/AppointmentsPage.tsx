import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addHours, format, isSameDay, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Trash2,
  UserRound,
  X
} from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import { preparePhoto } from '../lib/images'
import type { AppointmentService, AppointmentStatus, Notify } from '../types'

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

function defaultTime() {
  return format(addHours(new Date(), 1), 'HH:mm')
}

function appointmentName(appointment: { nickname?: string; customerName: string }) {
  return appointment.nickname || appointment.customerName
}

interface AppointmentsPageProps {
  notify: Notify
}

export function AppointmentsPage({ notify }: AppointmentsPageProps) {
  const appointments = useLiveQuery(() => db.appointments.orderBy('scheduledAt').toArray(), []) ?? []
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => startOfDay(new Date()))
  const [open, setOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [wechatName, setWechatName] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [appointmentTime, setAppointmentTime] = useState(defaultTime)
  const [appointmentType, setAppointmentType] = useState<AppointmentService>('experience')
  const [customAmount, setCustomAmount] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const bookedDates = useMemo(
    () => appointments.map((appointment) => startOfDay(new Date(appointment.scheduledAt))),
    [appointments]
  )
  const appointmentsForDay = appointments.filter((appointment) =>
    isSameDay(new Date(appointment.scheduledAt), selectedDate)
  )

  const reset = () => {
    setNickname('')
    setWechatId('')
    setWechatName('')
    setAppointmentDate(format(selectedDate, 'yyyy-MM-dd'))
    setAppointmentTime(defaultTime())
    setAppointmentType('experience')
    setCustomAmount('')
    setPhotoDataUrl('')
    setPhotoBusy(false)
  }
  const close = () => {
    setOpen(false)
    reset()
  }
  const openForm = () => {
    setAppointmentDate(format(selectedDate, 'yyyy-MM-dd'))
    setOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!nickname.trim() || !wechatId.trim() || !wechatName.trim()) {
      notify('请完整填写昵称和微信信息')
      return
    }
    const amount = appointmentType === 'experience' ? 1380 : Number(customAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      notify('请输入正确的全脸金额')
      return
    }
    const scheduledDate = new Date(`${appointmentDate}T${appointmentTime}`)
    if (Number.isNaN(scheduledDate.getTime())) {
      notify('请选择正确的预约日期和时间')
      return
    }

    const appointmentId = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const serviceName = serviceLabels[appointmentType]
    const memberName = nickname.trim()
    const memberWechatId = wechatId.trim()
    setSaving(true)
    try {
      await db.transaction('rw', db.appointments, db.ledgerEntries, db.customers, async () => {
        await db.appointments.add({
          id: appointmentId,
          customerName: memberName,
          phone: '',
          serviceName,
          scheduledAt: scheduledDate.toISOString(),
          notes: '',
          status: 'upcoming',
          createdAt,
          nickname: memberName,
          wechatId: memberWechatId,
          wechatName: wechatName.trim(),
          appointmentType,
          amount,
          photoDataUrl: photoDataUrl || undefined
        })
        await db.ledgerEntries.add({
          id: crypto.randomUUID(),
          title: `预约${serviceName}`,
          amount,
          kind: 'income',
          occurredAt: createdAt,
          notes: `${memberName} · ${format(scheduledDate, 'M月d日 HH:mm')}`,
          createdAt,
          appointmentId
        })

        const normalizedWechatId = memberWechatId.toLocaleLowerCase('zh-CN')
        const member = await db.customers
          .filter((customer) => (customer.wechatId || '').trim().toLocaleLowerCase('zh-CN') === normalizedWechatId)
          .first()
        if (member) {
          await db.customers.update(member.id, {
            name: memberName,
            wechatId: memberWechatId,
            serviceType: appointmentType,
            amount: (member.amount || 0) + amount,
            sessions: (member.sessions || 0) + 1,
            repairDate: appointmentDate,
            photoDataUrl: photoDataUrl || member.photoDataUrl
          })
        } else {
          await db.customers.add({
            id: crypto.randomUUID(),
            name: memberName,
            phone: '',
            skinNotes: '',
            createdAt,
            wechatId: memberWechatId,
            serviceType: appointmentType,
            amount,
            sessions: 1,
            repairDate: appointmentDate,
            photoDataUrl: photoDataUrl || undefined
          })
        }
      })

      setSelectedDate(startOfDay(scheduledDate))
      setCalendarMonth(startOfDay(scheduledDate))
      close()
      notify(`预约已保存，已记账并同步会员 ${currency.format(amount)}`)
    } catch {
      notify('预约保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    try {
      setPhotoDataUrl(await preparePhoto(file))
    } catch (error) {
      notify(error instanceof Error ? error.message : '照片处理失败')
    } finally {
      setPhotoBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('确定删除这条预约吗？对应的收支记录会保留。')) return
    await db.appointments.delete(id)
    notify('预约已删除，收支记录已保留')
  }

  return (
    <section className="page appointments-page">
      <PageHeader
        eyebrow="SCHEDULE"
        title="预约"
        subtitle="按日期安排护理与服务"
        action={<button className="action-button" type="button" onClick={openForm}><Plus size={17} />新增</button>}
      />

      <section className="calendar-panel surface" aria-label="预约日历">
        <DayPicker
          animate
          className="appointment-calendar"
          fixedWeeks
          locale={zhCN}
          mode="single"
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelect={(date) => date && setSelectedDate(startOfDay(date))}
          selected={selectedDate}
          showOutsideDays
          weekStartsOn={1}
          modifiers={{ hasAppointment: bookedDates }}
          modifiersClassNames={{ hasAppointment: 'has-appointment' }}
          components={{
            Chevron: ({ className, orientation }) => {
              const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
              return <Icon className={className} size={18} />
            }
          }}
        />
        <div className="calendar-legend"><span aria-hidden="true" />有预约日期</div>
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
        <EmptyState icon={CalendarDays} title="当天没有预约" message="选择其他日期，或点击右上角新增预约" />
      ) : (
        <div className="record-list appointment-list">
          {appointmentsForDay.map((appointment) => {
            const date = new Date(appointment.scheduledAt)
            const name = appointmentName(appointment)
            const serviceName = appointment.appointmentType
              ? serviceLabels[appointment.appointmentType]
              : appointment.serviceName
            return (
              <article className="appointment-card surface" key={appointment.id}>
                {appointment.photoDataUrl ? (
                  <img className="appointment-photo" src={appointment.photoDataUrl} alt={`${name}的预约照片`} />
                ) : (
                  <span className="appointment-photo placeholder" aria-hidden="true"><UserRound size={24} /></span>
                )}
                <div className="record-copy appointment-copy">
                  <div className="record-title-line">
                    <h2>{name}</h2>
                    <span className={`service-tag ${appointment.appointmentType || 'legacy'}`}>{serviceName}</span>
                  </div>
                  {appointment.wechatName || appointment.wechatId ? (
                    <p>{appointment.wechatName ? `微信昵称：${appointment.wechatName}` : ''}{appointment.wechatName && appointment.wechatId ? ' · ' : ''}{appointment.wechatId ? `微信号：${appointment.wechatId}` : ''}</p>
                  ) : null}
                  <small><Clock3 size={13} />{format(date, 'HH:mm')}{appointment.amount ? ` · ${currency.format(appointment.amount)}` : ''}</small>
                </div>
                <select
                  className={`status-select ${appointment.status}`}
                  aria-label={`${name}的预约状态`}
                  value={appointment.status}
                  onChange={(event) => db.appointments.update(appointment.id, { status: event.target.value as AppointmentStatus })}
                >
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button className="danger-icon-button" type="button" onClick={() => remove(appointment.id)} aria-label="删除预约" title="删除预约"><Trash2 size={17} /></button>
              </article>
            )
          })}
        </div>
      )}

      <Modal title="新增预约" open={open} onClose={close}>
        <form className="data-form appointment-form" onSubmit={submit}>
          <label htmlFor="appointment-nickname">昵称<input id="appointment-nickname" required value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="name" /></label>
          <label htmlFor="appointment-wechat-id">微信号<input id="appointment-wechat-id" required value={wechatId} onChange={(event) => setWechatId(event.target.value)} autoCapitalize="none" /></label>
          <label htmlFor="appointment-wechat-name">微信昵称<input id="appointment-wechat-name" required value={wechatName} onChange={(event) => setWechatName(event.target.value)} /></label>
          <label htmlFor="appointment-date">预约日期<input id="appointment-date" required type="date" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} /></label>
          <label htmlFor="appointment-time">预约时间<input id="appointment-time" required type="time" value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} /></label>

          <fieldset className="segmented service-picker full-field">
            <legend>预约项目</legend>
            <label className={appointmentType === 'experience' ? 'active' : ''}>
              <input type="radio" name="appointment-type" value="experience" checked={appointmentType === 'experience'} onChange={() => setAppointmentType('experience')} />
              <span>体验</span><small>固定 ￥1,380</small>
            </label>
            <label className={appointmentType === 'full-face' ? 'active' : ''}>
              <input type="radio" name="appointment-type" value="full-face" checked={appointmentType === 'full-face'} onChange={() => setAppointmentType('full-face')} />
              <span>全脸</span><small>手动填写金额</small>
            </label>
          </fieldset>

          {appointmentType === 'full-face' ? (
            <label className="full-field" htmlFor="appointment-amount">全脸金额<input id="appointment-amount" required type="number" min="0.01" step="0.01" inputMode="decimal" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} /></label>
          ) : (
            <div className="fixed-amount full-field"><span>预约收入</span><strong>{currency.format(1380)}</strong><small>保存预约后自动记入收支</small></div>
          )}

          <div className="photo-field full-field">
            <span className="field-label">顾客照片（可选）</span>
            {photoDataUrl ? (
              <div className="photo-preview">
                <img src={photoDataUrl} alt="待保存的顾客照片预览" />
                <button className="danger-icon-button" type="button" onClick={() => setPhotoDataUrl('')} aria-label="移除照片" title="移除照片"><X size={17} /></button>
              </div>
            ) : (
              <label className="photo-picker">
                <input className="visually-hidden-input" type="file" accept="image/*" onChange={selectPhoto} disabled={photoBusy} />
                <Camera size={20} />
                <span>{photoBusy ? '正在处理照片...' : '选择或拍摄照片'}</span>
                <small>照片将与本次预约关联</small>
              </label>
            )}
          </div>

          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={close}>取消</button>
            <button className="primary-button" type="submit" disabled={photoBusy || saving}>{saving ? '正在保存...' : '保存预约并记账'}</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function StatusCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><strong className={tone}>{value}</strong><span>{label}</span></div>
}
