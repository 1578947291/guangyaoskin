import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CuteIcon } from '../components/CuteIcon'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import { createId } from '../lib/id'
import { ledgerOccurrence } from '../lib/ledger'
import type { Appointment, LedgerKind, Notify } from '../types'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

interface FinancePageProps {
  notify: Notify
  onOpenSummary: () => void
}

export function FinancePage({ notify, onOpenSummary }: FinancePageProps) {
  const entries = useLiveQuery(() => db.ledgerEntries.orderBy('occurredAt').reverse().toArray(), []) ?? []
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<LedgerKind>('income')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
  })
  const [notes, setNotes] = useState('')

  const now = new Date()
  const appointmentsById = new Map<string, Appointment>(appointments.map((appointment) => [appointment.id, appointment]))
  const sortedEntries = [...entries].sort((first, second) =>
    new Date(ledgerOccurrence(second, appointmentsById)).getTime() -
    new Date(ledgerOccurrence(first, appointmentsById)).getTime()
  )
  const monthly = sortedEntries.filter((entry) => {
    const date = new Date(ledgerOccurrence(entry, appointmentsById))
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })
  const income = monthly.filter((entry) => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0)
  const expense = monthly.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return
    await db.ledgerEntries.add({
      id: createId(),
      title: title.trim(),
      amount: numericAmount,
      kind,
      occurredAt: new Date(occurredAt).toISOString(),
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    })
    setTitle('')
    setAmount('')
    setNotes('')
    setOpen(false)
    notify('收支记录已保存')
  }

  const remove = async (id: string) => {
    if (!window.confirm('确定删除这条收支记录吗？')) return
    await db.ledgerEntries.delete(id)
    notify('收支记录已删除')
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="FINANCE"
        title="收支"
        subtitle="记录每一笔经营往来"
        action={<button className="action-button" type="button" onClick={() => setOpen(true)}><CuteIcon name="plus" size={17} />新增</button>}
      />

      <button className="balance-card balance-card-button surface" type="button" onClick={onOpenSummary} aria-label="查看本月结余明细">
        <div className="balance-heading">
          <div><span>本月结余</span><strong>{currency.format(income - expense)}</strong></div>
          <span className="balance-open-icon"><CuteIcon name="trend" size={20} /><CuteIcon name="right" size={17} /></span>
        </div>
        <div className="balance-split">
          <BalanceItem label="收入" value={income} kind="income" />
          <BalanceItem label="支出" value={expense} kind="expense" />
        </div>
      </button>

      {sortedEntries.length === 0 ? (
        <EmptyState icon="trend" title="还没有收支记录" message="点击右上角记录第一笔收入或支出" />
      ) : (
        <section className="recent-section">
          <h2>最近记录</h2>
          <div className="record-list ledger-list">
            {sortedEntries.map((entry) => (
              <article className="record-row ledger-row surface" key={entry.id}>
                <span className={`round-icon ${entry.kind === 'income' ? 'teal' : 'coral'}`}>
                  <CuteIcon name={entry.kind === 'income' ? 'income' : 'expense'} size={17} />
                </span>
                <div className="record-copy">
                  <h3>{entry.title}</h3>
                  <small>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ledgerOccurrence(entry, appointmentsById)))}</small>
                </div>
                <strong className={`money ${entry.kind}`}>{entry.kind === 'income' ? '+' : '-'}{currency.format(entry.amount)}</strong>
                <button className="danger-icon-button" type="button" onClick={() => remove(entry.id)} aria-label="删除收支记录" title="删除收支记录"><CuteIcon name="delete" size={17} /></button>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal title="新增收支" open={open} onClose={() => setOpen(false)}>
        <form className="data-form" onSubmit={submit}>
          <fieldset className="segmented full-field">
            <legend className="sr-only">收支类型</legend>
            <label className={kind === 'income' ? 'active' : ''}><input type="radio" name="kind" value="income" checked={kind === 'income'} onChange={() => setKind('income')} />收入</label>
            <label className={kind === 'expense' ? 'active' : ''}><input type="radio" name="kind" value="expense" checked={kind === 'expense'} onChange={() => setKind('expense')} />支出</label>
          </fieldset>
          <label>项目名称<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>金额<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>发生时间<input required type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></label>
          <label>备注<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={() => setOpen(false)}>取消</button>
            <button className="primary-button" type="submit">保存记录</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function BalanceItem({ label, value, kind }: { label: string; value: number; kind: LedgerKind }) {
  return (
    <div className={`balance-item ${kind}`}>
      <span className={`round-icon ${kind === 'income' ? 'teal' : 'coral'}`}><CuteIcon name={kind === 'income' ? 'income' : 'expense'} size={14} /></span>
      <div><span>{label}</span><strong>{currency.format(value)}</strong></div>
    </div>
  )
}
