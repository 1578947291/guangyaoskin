import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CuteIcon } from '../components/CuteIcon'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import { customerBookedSessions, customerOutstandingBalance, customerRemainingSessions, customerTotalQuote } from '../lib/customerBalance'
import { createId } from '../lib/id'
import { preparePhoto } from '../lib/images'
import type { Notify } from '../types'
import { CustomerDetailPage } from './CustomerDetailPage'
import { CustomerPhotosPage } from './CustomerPhotosPage'

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

interface RegistrationPageProps {
  notify: Notify
  customerId?: string
  appointmentId?: string
  customerView?: 'photos'
  onOpenCustomer: (customerId: string) => void
  onOpenAppointment: (customerId: string, appointmentId: string) => void
  onOpenPhotos: (customerId: string) => void
  onBackCustomer: () => void
  onBackAppointment: (customerId: string) => void
  onBackPhotos: (customerId: string) => void
}

export function RegistrationPage({
  notify,
  customerId,
  appointmentId,
  customerView,
  onOpenCustomer,
  onOpenAppointment,
  onOpenPhotos,
  onBackCustomer,
  onBackAppointment,
  onBackPhotos
}: RegistrationPageProps) {
  const customers = useLiveQuery(() => db.customers.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [totalQuote, setTotalQuote] = useState('')
  const [requiredSessions, setRequiredSessions] = useState('1')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = customers.filter((customer) => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    if (!keyword) return true
    return [customer.name, customer.phone, customer.wechatId || '']
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
  })

  const reset = () => {
    setName('')
    setPhone('')
    setWechatId('')
    setTotalQuote('')
    setRequiredSessions('1')
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
    if (!name.trim() || !wechatId.trim()) {
      notify('请完整填写姓名和微信号')
      return
    }
    const quote = Number(totalQuote)
    const sessionCount = Number(requiredSessions)
    if (!Number.isFinite(quote) || quote <= 0) {
      notify('请输入正确的总体报价')
      return
    }
    if (!Number.isInteger(sessionCount) || sessionCount <= 0) {
      notify('请输入正确的需要修复次数')
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
        amount: quote,
        sessions: sessionCount,
        totalQuote: quote,
        requiredSessions: sessionCount,
        outstandingBalance: quote,
        remainingSessions: sessionCount,
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

  if (detailCustomer && customerView === 'photos') {
    return <CustomerPhotosPage customer={detailCustomer} notify={notify} onBack={() => onBackPhotos(detailCustomer.id)} />
  }

  if (detailCustomer) {
    return (
      <CustomerDetailPage
        customer={detailCustomer}
        appointmentId={appointmentId}
        onBack={onBackCustomer}
        onOpenAppointment={(selectedAppointmentId) => onOpenAppointment(detailCustomer.id, selectedAppointmentId)}
        onOpenPhotos={() => onOpenPhotos(detailCustomer.id)}
        onBackAppointment={() => onBackAppointment(detailCustomer.id)}
      />
    )
  }

  return (
    <section className="page registration-page">
      <PageHeader
        eyebrow=""
        title="登记"
        subtitle="顾客项目与修复记录"
        action={<button className="action-button" type="button" onClick={() => setOpen(true)}><CuteIcon name="userAdd" size={17} />新增</button>}
      />

      <label className="search-box registration-search">
        <CuteIcon name="search" size={18} />
        <span className="sr-only">搜索姓名、电话或微信号</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名、电话或微信号" />
        {search ? <button type="button" onClick={() => setSearch('')} aria-label="清除搜索" title="清除搜索"><CuteIcon name="close" size={17} /></button> : null}
      </label>

      {customers.length === 0 ? (
        <EmptyState icon="userAdd" title="还没有顾客登记" message="点击右上角新增第一条登记" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="没有匹配结果" message="换一个姓名、电话、微信号或项目试试" />
      ) : (
        <div className="record-list customer-list">
          {filtered.map((customer) => {
            const outstandingBalance = customerOutstandingBalance(customer)
            const bookedSessions = customerBookedSessions(customer)
            const remainingSessions = customerRemainingSessions(customer)
            const totalQuote = customerTotalQuote(customer)
            return (
              <article className="registration-card surface" key={customer.id}>
                <button className="registration-detail-hitarea" type="button" onClick={() => onOpenCustomer(customer.id)} aria-label={`查看${customer.name}的用户详情`} />
                {customer.photoDataUrl ? (
                  <img className="registration-photo" src={customer.photoDataUrl} alt={`${customer.name}的登记照片`} />
                ) : (
                  <span className="registration-photo placeholder" aria-hidden="true"><CuteIcon name="user" size={25} /></span>
                )}
                <div className="record-copy registration-copy">
                  <div className="record-title-line">
                    <h2>{customer.name}</h2>
                    <span className="service-tag legacy">会员</span>
                  </div>
                  <p>登记时间：{registrationDate.format(new Date(customer.createdAt))}</p>
                  <small>已约 {bookedSessions} 次 · 剩余 {remainingSessions} 次 · 尾款 {currency.format(outstandingBalance)}</small>
                  {totalQuote ? <small>总报价 {currency.format(totalQuote)}</small> : null}
                </div>
                <button className="danger-icon-button" type="button" onClick={() => remove(customer.id)} aria-label="删除顾客登记" title="删除顾客登记"><CuteIcon name="delete" size={17} /></button>
              </article>
            )
          })}
        </div>
      )}

      <Modal title="新增登记" open={open} onClose={close} className="registration-modal">
        <form className="data-form registration-form" onSubmit={submit} noValidate>
          <section className="registration-form-section">
            <h3>客户资料</h3>
            <div className="registration-form-grid">
              <label htmlFor="registration-name"><span className="form-label">姓名<small>必填</small></span><input id="registration-name" required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
              <label htmlFor="registration-phone"><span className="form-label">电话<small>选填</small></span><input id="registration-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
              <label className="full-field" htmlFor="registration-wechat"><span className="form-label">微信号<small>必填</small></span><input id="registration-wechat" required value={wechatId} onChange={(event) => setWechatId(event.target.value)} autoCapitalize="none" /></label>
            </div>
          </section>

          <section className="registration-form-section">
            <h3>报价与次数</h3>
            <div className="registration-form-grid">
              <label htmlFor="registration-total-quote"><span className="form-label">总体报价<small>必填</small></span><input id="registration-total-quote" required type="number" min="0.01" step="0.01" inputMode="decimal" value={totalQuote} onChange={(event) => setTotalQuote(event.target.value)} /></label>
              <label htmlFor="registration-required-sessions"><span className="form-label">需要修复次数<small>必填</small></span><input id="registration-required-sessions" required type="number" min="1" step="1" inputMode="numeric" value={requiredSessions} onChange={(event) => setRequiredSessions(event.target.value)} /></label>
            </div>
          </section>

          <section className="registration-form-section registration-media-section">
            <h3>照片与备注</h3>
            <div className="photo-field">
              <span className="field-label">照片</span>
              {photoDataUrl ? (
                <div className="photo-preview">
                  <img src={photoDataUrl} alt="待保存的登记照片预览" />
                  <button className="danger-icon-button" type="button" onClick={() => setPhotoDataUrl('')} aria-label="移除照片" title="移除照片"><CuteIcon name="close" size={17} /></button>
                </div>
              ) : (
                <label className="photo-picker">
                  <input className="visually-hidden-input" type="file" accept="image/*" onChange={selectPhoto} disabled={photoBusy} />
                  <CuteIcon name="camera" size={20} />
                  <span>{photoBusy ? '正在处理照片...' : '选择或拍摄照片'}</span>
                  <small>照片将与本次登记关联</small>
                </label>
              )}
            </div>

            <label htmlFor="registration-notes"><span className="form-label">备注<small>选填</small></span><textarea id="registration-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="记录肤质、护理重点或其他说明" /></label>
          </section>
          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={close}>取消</button>
            <button className="primary-button" type="submit" disabled={photoBusy || saving}>{saving ? '正在保存...' : '保存登记'}</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
