import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileUp,
  Plus,
  Trash2,
  TrendingUp
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import { createBackup, restoreBackup } from '../lib/backup'
import type { LedgerKind, Notify } from '../types'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

interface FinancePageProps {
  notify: Notify
}

export function FinancePage({ notify }: FinancePageProps) {
  const entries = useLiveQuery(() => db.ledgerEntries.orderBy('occurredAt').reverse().toArray(), []) ?? []
  const fileInput = useRef<HTMLInputElement>(null)
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
  const monthly = entries.filter((entry) => {
    const date = new Date(entry.occurredAt)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })
  const income = monthly.filter((entry) => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0)
  const expense = monthly.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return
    await db.ledgerEntries.add({
      id: crypto.randomUUID(),
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

  const backup = async () => {
    try {
      await createBackup()
      notify('备份文件已生成')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notify('备份失败，请重试')
    }
  }

  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !window.confirm('恢复备份会覆盖当前设备上的全部数据，确定继续吗？')) return
    try {
      await restoreBackup(file)
      notify('备份恢复完成')
    } catch (error) {
      notify(error instanceof Error ? error.message : '恢复失败')
    }
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="FINANCE"
        title="收支"
        subtitle="记录每一笔经营往来"
        action={<button className="action-button" type="button" onClick={() => setOpen(true)}><Plus size={17} />新增</button>}
      />

      <section className="balance-card surface">
        <div className="balance-heading">
          <div><span>本月结余</span><strong>{currency.format(income - expense)}</strong></div>
          <span className="round-icon gold"><TrendingUp size={20} /></span>
        </div>
        <div className="balance-split">
          <BalanceItem label="收入" value={income} kind="income" />
          <BalanceItem label="支出" value={expense} kind="expense" />
        </div>
      </section>

      <div className="backup-actions" aria-label="数据备份">
        <button className="secondary-button" type="button" onClick={backup}><Download size={16} />备份</button>
        <button className="secondary-button" type="button" onClick={() => fileInput.current?.click()}><FileUp size={16} />恢复</button>
        <input ref={fileInput} className="visually-hidden-input" type="file" accept="application/json,.json" onChange={restore} />
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={TrendingUp} title="还没有收支记录" message="点击右上角记录第一笔收入或支出" />
      ) : (
        <section className="recent-section">
          <h2>最近记录</h2>
          <div className="record-list ledger-list">
            {entries.map((entry) => (
              <article className="record-row ledger-row surface" key={entry.id}>
                <span className={`round-icon ${entry.kind === 'income' ? 'teal' : 'coral'}`}>
                  {entry.kind === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>
                <div className="record-copy">
                  <h3>{entry.title}</h3>
                  <small>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(entry.occurredAt))}</small>
                </div>
                <strong className={`money ${entry.kind}`}>{entry.kind === 'income' ? '+' : '-'}{currency.format(entry.amount)}</strong>
                <button className="danger-icon-button" type="button" onClick={() => remove(entry.id)} aria-label="删除收支记录" title="删除收支记录"><Trash2 size={17} /></button>
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
  const Icon = kind === 'income' ? ArrowDownLeft : ArrowUpRight
  return (
    <div className={`balance-item ${kind}`}>
      <span className={`round-icon ${kind === 'income' ? 'teal' : 'coral'}`}><Icon size={14} /></span>
      <div><span>{label}</span><strong>{currency.format(value)}</strong></div>
    </div>
  )
}
