import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarRange
} from 'lucide-react'
import { EmptyState } from '../components/PageElements'
import { db } from '../db'
import { ledgerOccurrence } from '../lib/ledger'
import type { Appointment, LedgerEntry } from '../types'

type PeriodMode = 'month' | 'year'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

function localMonthValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function entryDate(entry: LedgerEntry, appointmentsById: Map<string, Appointment>) {
  return new Date(ledgerOccurrence(entry, appointmentsById))
}

interface FinanceSummaryPageProps {
  onBack: () => void
}

export function FinanceSummaryPage({ onBack }: FinanceSummaryPageProps) {
  const entries = useLiveQuery(() => db.ledgerEntries.toArray(), []) ?? []
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const now = new Date()
  const [mode, setMode] = useState<PeriodMode>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => localMonthValue(now))
  const [selectedYear, setSelectedYear] = useState(() => String(now.getFullYear()))
  const appointmentsById = useMemo(
    () => new Map<string, Appointment>(appointments.map((appointment) => [appointment.id, appointment])),
    [appointments]
  )
  const availableYears = useMemo(() => {
    const years = new Set(entries.map((entry) => entryDate(entry, appointmentsById).getFullYear()))
    years.add(now.getFullYear())
    return Array.from(years).filter(Number.isFinite).sort((first, second) => second - first)
  }, [appointmentsById, entries, now])
  const filteredEntries = entries
    .filter((entry) => {
      const date = entryDate(entry, appointmentsById)
      if (Number.isNaN(date.getTime())) return false
      if (mode === 'year') return date.getFullYear() === Number(selectedYear)
      return localMonthValue(date) === selectedMonth
    })
    .sort((first, second) => entryDate(second, appointmentsById).getTime() - entryDate(first, appointmentsById).getTime())
  const income = filteredEntries.filter((entry) => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0)
  const expense = filteredEntries.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0)
  const periodLabel = mode === 'month'
    ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(new Date(`${selectedMonth}-01T00:00:00`))
    : `${selectedYear}年`

  return (
    <section className="page finance-summary-page">
      <header className="detail-page-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回收支页面" title="返回">
          <ArrowLeft size={20} />
        </button>
        <div><p>FINANCE DETAIL</p><h1>收支明细</h1></div>
        <span className="finance-period-count">{filteredEntries.length} 笔</span>
      </header>

      <section className="finance-filter-panel surface" aria-label="查询周期">
        <div className="period-segmented" role="group" aria-label="查询方式">
          <button type="button" className={mode === 'month' ? 'active' : ''} aria-pressed={mode === 'month'} onClick={() => setMode('month')}>按月</button>
          <button type="button" className={mode === 'year' ? 'active' : ''} aria-pressed={mode === 'year'} onClick={() => setMode('year')}>按年</button>
        </div>
        {mode === 'month' ? (
          <label htmlFor="finance-query-month">选择月份<input id="finance-query-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
        ) : (
          <label htmlFor="finance-query-year">选择年份<select id="finance-query-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            {availableYears.map((year) => <option key={year} value={year}>{year}年</option>)}
          </select></label>
        )}
      </section>

      <section className="finance-period-summary surface" aria-label={`${periodLabel}收支汇总`}>
        <div className="finance-period-heading"><span>{periodLabel}结余</span><strong>{currency.format(income - expense)}</strong></div>
        <div className="balance-split">
          <SummaryItem label="收入" value={income} kind="income" />
          <SummaryItem label="支出" value={expense} kind="expense" />
        </div>
      </section>

      {filteredEntries.length ? (
        <section className="recent-section">
          <div className="finance-record-heading"><h2>{periodLabel}流水</h2><span>{filteredEntries.length} 笔</span></div>
          <div className="record-list ledger-list finance-ledger-list">
            {filteredEntries.map((entry) => {
              const date = entryDate(entry, appointmentsById)
              return (
                <article className="record-row ledger-row finance-ledger-row surface" key={entry.id}>
                  <span className={`round-icon ${entry.kind === 'income' ? 'teal' : 'coral'}`}>
                    {entry.kind === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                  </span>
                  <div className="record-copy">
                    <h3>{entry.title}</h3>
                    <small>{new Intl.DateTimeFormat('zh-CN', { year: mode === 'year' ? 'numeric' : undefined, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)}</small>
                    {entry.notes ? <p>{entry.notes}</p> : null}
                  </div>
                  <strong className={`money ${entry.kind}`}>{entry.kind === 'income' ? '+' : '-'}{currency.format(entry.amount)}</strong>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <EmptyState icon={CalendarRange} title={`${periodLabel}暂无记录`} message="切换月份或年份查看其他经营流水" />
      )}
    </section>
  )
}

function SummaryItem({ label, value, kind }: { label: string; value: number; kind: 'income' | 'expense' }) {
  const Icon = kind === 'income' ? ArrowDownLeft : ArrowUpRight
  return (
    <div className={`balance-item ${kind}`}>
      <span className={`round-icon ${kind === 'income' ? 'teal' : 'coral'}`}><Icon size={14} /></span>
      <div><span>{label}</span><strong>{currency.format(value)}</strong></div>
    </div>
  )
}
