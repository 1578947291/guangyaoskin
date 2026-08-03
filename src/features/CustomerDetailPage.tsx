import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CuteIcon, type CuteIconName } from '../components/CuteIcon'
import { Modal } from '../components/Modal'
import { db } from '../db'
import {
  customerBookedSessions,
  customerOutstandingBalance,
  customerRemainingSessions,
  customerRequiredSessions,
  customerTotalQuote
} from '../lib/customerBalance'
import { customerAppointments } from '../lib/customerAppointments'
import { customerPhotos } from '../lib/customerPhotos'
import type { AppointmentService, AppointmentStatus, CustomerRecord } from '../types'
import { AppointmentDetailPage } from './AppointmentDetailPage'

const serviceLabels: Record<AppointmentService, string> = {
  experience: '体验',
  'full-face': '全脸修复'
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
  notify: (message: string) => void
  onBack: () => void
  onOpenAppointment: (appointmentId: string) => void
  onOpenPhotos: () => void
  onBackAppointment: () => void
}

export function CustomerDetailPage({
  customer,
  appointmentId,
  notify,
  onBack,
  onOpenAppointment,
  onOpenPhotos,
  onBackAppointment
}: CustomerDetailPageProps) {
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(customer.name)
  const [editPhone, setEditPhone] = useState(customer.phone)
  const [editWechatId, setEditWechatId] = useState(customer.wechatId || '')
  const [editTotalQuote, setEditTotalQuote] = useState(String(customerTotalQuote(customer) || ''))
  const [editRequiredSessions, setEditRequiredSessions] = useState(String(customerRequiredSessions(customer) || 1))
  const [editNotes, setEditNotes] = useState(customer.skinNotes)
  const [savingEdit, setSavingEdit] = useState(false)
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

  const totalQuote = customerTotalQuote(customer)
  const outstandingBalance = customerOutstandingBalance(customer)
  const bookedSessions = customerBookedSessions(customer)
  const requiredSessions = customerRequiredSessions(customer)
  const remainingSessions = customerRemainingSessions(customer)
  const paidAmount = Math.max(0, totalQuote - outstandingBalance)

  const openEdit = () => {
    setEditName(customer.name)
    setEditPhone(customer.phone)
    setEditWechatId(customer.wechatId || '')
    setEditTotalQuote(String(totalQuote || ''))
    setEditRequiredSessions(String(requiredSessions || 1))
    setEditNotes(customer.skinNotes)
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editName.trim() || !editWechatId.trim()) {
      notify('请完整填写姓名和微信号')
      return
    }
    const nextTotalQuote = Number(editTotalQuote)
    const nextRequiredSessions = Number(editRequiredSessions)
    if (!Number.isFinite(nextTotalQuote) || nextTotalQuote <= 0) {
      notify('请输入正确的总体报价')
      return
    }
    if (nextTotalQuote < paidAmount) {
      notify('总体报价不能小于已收款金额')
      return
    }
    if (!Number.isInteger(nextRequiredSessions) || nextRequiredSessions <= 0) {
      notify('请输入正确的需要修复次数')
      return
    }
    if (nextRequiredSessions < bookedSessions) {
      notify('需要修复次数不能小于已预约次数')
      return
    }

    setSavingEdit(true)
    try {
      await db.customers.update(customer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        skinNotes: editNotes.trim(),
        wechatId: editWechatId.trim(),
        amount: nextTotalQuote,
        sessions: nextRequiredSessions,
        totalQuote: nextTotalQuote,
        requiredSessions: nextRequiredSessions,
        outstandingBalance: nextTotalQuote - paidAmount,
        remainingSessions: nextRequiredSessions - bookedSessions
      })
      closeEdit()
      notify('用户资料已更新')
    } catch {
      notify('用户资料保存失败，请重试')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <section className="page customer-detail-page">
      <header className="detail-page-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回登记列表" title="返回">
          <CuteIcon name="back" size={20} />
        </button>
        <div><h1>用户详情</h1></div>
        <button className="secondary-button compact-button customer-edit-button" type="button" onClick={openEdit}><CuteIcon name="note" size={16} />编辑</button>
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
          <DetailItem icon="wallet" label="总体报价" value={currency.format(totalQuote)} />
          <DetailItem icon="money" label="还需支付尾款" value={currency.format(outstandingBalance)} />
          <DetailItem icon="clock" label="需要修复次数" value={`${requiredSessions} 次`} />
          <DetailItem icon="calendar" label="已预约次数" value={`${bookedSessions} 次`} />
          <DetailItem icon="service" label="剩余修复次数" value={`${remainingSessions} 次`} />
        </div>

        <div className="detail-notes">
          <header><CuteIcon name="note" size={17} /><h2>登记备注</h2></header>
          <p className={customer.skinNotes ? '' : 'empty'}>{customer.skinNotes || '无备注'}</p>
        </div>
      </section>

      <Modal title="编辑用户资料" open={editOpen} onClose={closeEdit} className="registration-modal">
        <form className="data-form registration-form" onSubmit={submitEdit} noValidate>
          <section className="registration-form-section">
            <h3>客户资料</h3>
            <div className="registration-form-grid">
              <label htmlFor="customer-edit-name"><span className="form-label">姓名<small>必填</small></span><input id="customer-edit-name" required value={editName} onChange={(event) => setEditName(event.target.value)} autoComplete="name" /></label>
              <label htmlFor="customer-edit-phone"><span className="form-label">电话<small>选填</small></span><input id="customer-edit-phone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
              <label className="full-field" htmlFor="customer-edit-wechat"><span className="form-label">微信号<small>必填</small></span><input id="customer-edit-wechat" required value={editWechatId} onChange={(event) => setEditWechatId(event.target.value)} autoCapitalize="none" /></label>
            </div>
          </section>

          <section className="registration-form-section">
            <h3>报价与次数</h3>
            <div className="registration-form-grid">
              <label htmlFor="customer-edit-total-quote"><span className="form-label">总体报价<small>必填</small></span><input id="customer-edit-total-quote" required type="number" min="0.01" step="0.01" inputMode="decimal" value={editTotalQuote} onChange={(event) => setEditTotalQuote(event.target.value)} /></label>
              <label htmlFor="customer-edit-required-sessions"><span className="form-label">需要修复次数<small>必填</small></span><input id="customer-edit-required-sessions" required type="number" min="1" step="1" inputMode="numeric" value={editRequiredSessions} onChange={(event) => setEditRequiredSessions(event.target.value)} /></label>
            </div>
            <p className="customer-edit-hint">已约 {bookedSessions} 次 · 已收 {currency.format(paidAmount)}，保存后自动重算尾款和剩余次数</p>
          </section>

          <section className="registration-form-section registration-media-section">
            <h3>备注</h3>
            <label htmlFor="customer-edit-notes"><span className="form-label">备注<small>选填</small></span><textarea id="customer-edit-notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={3} placeholder="记录肤质、护理重点或其他说明" /></label>
          </section>

          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={closeEdit}>取消</button>
            <button className="primary-button" type="submit" disabled={savingEdit}>{savingEdit ? '正在保存...' : '保存修改'}</button>
          </div>
        </form>
      </Modal>

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
