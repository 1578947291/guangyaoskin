import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Search, Trash2, UserPlus, UserRound, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import { createId } from '../lib/id'
import { preparePhoto } from '../lib/images'
import type { AppointmentService, Notify } from '../types'
import { CustomerDetailPage } from './CustomerDetailPage'

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

const registrationDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

function todayValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

interface RegistrationPageProps {
  notify: Notify
  customerId?: string
  appointmentId?: string
  onOpenCustomer: (customerId: string) => void
  onOpenAppointment: (customerId: string, appointmentId: string) => void
  onBackCustomer: () => void
  onBackAppointment: (customerId: string) => void
}

export function RegistrationPage({
  notify,
  customerId,
  appointmentId,
  onOpenCustomer,
  onOpenAppointment,
  onBackCustomer,
  onBackAppointment
}: RegistrationPageProps) {
  const customers = useLiveQuery(() => db.customers.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [serviceType, setServiceType] = useState<AppointmentService>('experience')
  const [customAmount, setCustomAmount] = useState('')
  const [sessions, setSessions] = useState('1')
  const [repairDate, setRepairDate] = useState(todayValue)
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = customers.filter((customer) => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    if (!keyword) return true
    const serviceName = customer.serviceType ? serviceLabels[customer.serviceType] : ''
    return [customer.name, customer.phone, customer.wechatId || '', serviceName]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
  })

  const reset = () => {
    setName('')
    setPhone('')
    setWechatId('')
    setServiceType('experience')
    setCustomAmount('')
    setSessions('1')
    setRepairDate(todayValue())
    setPhotoDataUrl('')
    setNotes('')
    setPhotoBusy(false)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !phone.trim() || !wechatId.trim()) {
      notify('请完整填写姓名、电话和微信号')
      return
    }
    const amount = serviceType === 'experience' ? 1380 : Number(customAmount)
    const sessionCount = Number(sessions)
    if (!Number.isFinite(amount) || amount <= 0) {
      notify('请输入正确的全脸金额')
      return
    }
    if (!Number.isInteger(sessionCount) || sessionCount <= 0) {
      notify('请输入正确的次数')
      return
    }

    setSaving(true)
    try {
      await db.customers.add({
        id: createId(),
        name: name.trim(),
        phone: phone.trim(),
        skinNotes: notes.trim(),
        createdAt: new Date().toISOString(),
        wechatId: wechatId.trim(),
        serviceType,
        amount,
        sessions: sessionCount,
        repairDate,
        repairStatus: 'pending',
        photoDataUrl: photoDataUrl || undefined,
        photoDataUrls: photoDataUrl ? [photoDataUrl] : undefined
      })
      close()
      notify('顾客登记已保存')
    } catch {
      notify('顾客登记保存失败，请重试')
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
    if (!window.confirm('确定删除这份顾客登记吗？')) return
    await db.customers.delete(id)
    notify('顾客登记已删除')
  }

  const detailCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined

  if (detailCustomer) {
    return (
      <CustomerDetailPage
        customer={detailCustomer}
        notify={notify}
        appointmentId={appointmentId}
        onBack={onBackCustomer}
        onOpenAppointment={(selectedAppointmentId) => onOpenAppointment(detailCustomer.id, selectedAppointmentId)}
        onBackAppointment={() => onBackAppointment(detailCustomer.id)}
      />
    )
  }

  return (
    <section className="page registration-page">
      <PageHeader
        eyebrow="CLIENTS"
        title="登记"
        subtitle="顾客项目与修复记录"
        action={<button className="action-button" type="button" onClick={() => setOpen(true)}><UserPlus size={17} />新增</button>}
      />

      <label className="search-box registration-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">搜索姓名、电话、微信号或项目</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名、电话、微信号或项目" />
        {search ? <button type="button" onClick={() => setSearch('')} aria-label="清除搜索" title="清除搜索"><X size={17} /></button> : null}
      </label>

      {customers.length === 0 ? (
        <EmptyState icon={UserPlus} title="还没有顾客登记" message="点击右上角新增第一条登记" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="没有匹配结果" message="换一个姓名、电话、微信号或项目试试" />
      ) : (
        <div className="record-list customer-list">
          {filtered.map((customer) => {
            const serviceName = customer.serviceType ? serviceLabels[customer.serviceType] : '未设置项目'
            return (
              <article className="registration-card surface" key={customer.id}>
                <button className="registration-detail-hitarea" type="button" onClick={() => onOpenCustomer(customer.id)} aria-label={`查看${customer.name}的用户详情`} />
                {customer.photoDataUrl ? (
                  <img className="registration-photo" src={customer.photoDataUrl} alt={`${customer.name}的登记照片`} />
                ) : (
                  <span className="registration-photo placeholder" aria-hidden="true"><UserRound size={25} /></span>
                )}
                <div className="record-copy registration-copy">
                  <div className="record-title-line">
                    <h2>{customer.name}</h2>
                    <span className={`service-tag ${customer.serviceType || 'legacy'}`}>{serviceName}</span>
                  </div>
                  <p>登记时间：{registrationDate.format(new Date(customer.createdAt))}</p>
                  {customer.amount || customer.sessions ? (
                    <small>{customer.amount ? currency.format(customer.amount) : ''}{customer.amount && customer.sessions ? ' · ' : ''}{customer.sessions ? `${customer.sessions} 次` : ''}</small>
                  ) : null}
                </div>
                <button className="danger-icon-button" type="button" onClick={() => remove(customer.id)} aria-label="删除顾客登记" title="删除顾客登记"><Trash2 size={17} /></button>
              </article>
            )
          })}
        </div>
      )}

      <Modal title="新增登记" open={open} onClose={close}>
        <form className="data-form registration-form" onSubmit={submit}>
          <label htmlFor="registration-name">姓名<input id="registration-name" required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <label htmlFor="registration-phone">电话<input id="registration-phone" required value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
          <label className="full-field" htmlFor="registration-wechat">微信号<input id="registration-wechat" required value={wechatId} onChange={(event) => setWechatId(event.target.value)} autoCapitalize="none" /></label>

          <fieldset className="segmented service-picker full-field">
            <legend>项目</legend>
            <label className={serviceType === 'experience' ? 'active' : ''}>
              <input type="radio" name="registration-service" value="experience" checked={serviceType === 'experience'} onChange={() => setServiceType('experience')} />
              <span>体验</span><small>固定 ￥1,380</small>
            </label>
            <label className={serviceType === 'full-face' ? 'active' : ''}>
              <input type="radio" name="registration-service" value="full-face" checked={serviceType === 'full-face'} onChange={() => setServiceType('full-face')} />
              <span>全脸</span><small>手动填写金额</small>
            </label>
          </fieldset>

          {serviceType === 'full-face' ? (
            <label htmlFor="registration-amount">金额<input id="registration-amount" required type="number" min="0.01" step="0.01" inputMode="decimal" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} /></label>
          ) : (
            <div className="fixed-amount"><span>项目金额</span><strong>{currency.format(1380)}</strong><small>体验项目固定金额</small></div>
          )}
          <label htmlFor="registration-sessions">次数<input id="registration-sessions" required type="number" min="1" step="1" inputMode="numeric" value={sessions} onChange={(event) => setSessions(event.target.value)} /></label>
          <label htmlFor="registration-repair-date">修复日期<input id="registration-repair-date" required type="date" value={repairDate} onChange={(event) => setRepairDate(event.target.value)} /></label>

          <div className="photo-field full-field">
            <span className="field-label">照片</span>
            {photoDataUrl ? (
              <div className="photo-preview">
                <img src={photoDataUrl} alt="待保存的登记照片预览" />
                <button className="danger-icon-button" type="button" onClick={() => setPhotoDataUrl('')} aria-label="移除照片" title="移除照片"><X size={17} /></button>
              </div>
            ) : (
              <label className="photo-picker">
                <input className="visually-hidden-input" type="file" accept="image/*" onChange={selectPhoto} disabled={photoBusy} />
                <Camera size={20} />
                <span>{photoBusy ? '正在处理照片...' : '选择或拍摄照片'}</span>
                <small>照片将与本次登记关联</small>
              </label>
            )}
          </div>

          <label className="full-field" htmlFor="registration-notes">备注（可选）<textarea id="registration-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="记录肤质、护理重点或其他说明" /></label>
          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={close}>取消</button>
            <button className="primary-button" type="submit" disabled={photoBusy || saving}>{saving ? '正在保存...' : '保存登记'}</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
