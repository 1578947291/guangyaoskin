import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const finance = await readFile(new URL('../src/features/FinancePage.tsx', import.meta.url), 'utf8')
const summary = await readFile(new URL('../src/features/FinanceSummaryPage.tsx', import.meta.url), 'utf8')

test('monthly balance opens the finance summary page', () => {
  assert.match(finance, /balance-card balance-card-button surface/)
  assert.match(finance, /onClick=\{onOpenSummary\}/)
})

test('finance page hides backup and restore controls', () => {
  assert.doesNotMatch(finance, /createBackup|restoreBackup/)
  assert.doesNotMatch(finance, />备份</)
  assert.doesNotMatch(finance, />恢复</)
})

test('finance summary can query by month and year', () => {
  assert.match(summary, /type PeriodMode = 'month' \| 'year'/)
  assert.match(summary, /id="finance-query-month" type="month"/)
  assert.match(summary, /id="finance-query-year"/)
  assert.match(summary, /mode === 'year'/)
})

test('finance summary reports income expense and balance for the selected period', () => {
  assert.match(summary, /const income = filteredEntries/)
  assert.match(summary, /const expense = filteredEntries/)
  assert.match(summary, /currency\.format\(income - expense\)/)
  assert.match(summary, /filteredEntries\.map/)
})
