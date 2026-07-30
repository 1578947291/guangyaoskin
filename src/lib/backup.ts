import { db } from '../db'
import type { Appointment, CustomerRecord, LedgerEntry } from '../types'

interface BackupPayload {
  version: 1
  app: '光曜塑肤'
  exportedAt: string
  appointments: Appointment[]
  customers: CustomerRecord[]
  ledgerEntries: LedgerEntry[]
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<BackupPayload>
  return payload.version === 1 &&
    payload.app === '光曜塑肤' &&
    Array.isArray(payload.appointments) &&
    Array.isArray(payload.customers) &&
    Array.isArray(payload.ledgerEntries)
}

export async function createBackup(): Promise<void> {
  const payload: BackupPayload = {
    version: 1,
    app: '光曜塑肤',
    exportedAt: new Date().toISOString(),
    appointments: await db.appointments.toArray(),
    customers: await db.customers.toArray(),
    ledgerEntries: await db.ledgerEntries.toArray()
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  const date = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()).replaceAll('/', '-')
  const filename = `光曜塑肤备份-${date}.json`

  const savePicker = (window as Window & {
    showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle>
  }).showSaveFilePicker

  if (savePicker) {
    const handle = await savePicker({
      suggestedName: filename,
      types: [{ description: 'JSON 备份', accept: { 'application/json': ['.json'] } }]
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function restoreBackup(file: File): Promise<void> {
  const parsed: unknown = JSON.parse(await file.text())
  if (!isBackupPayload(parsed)) {
    throw new Error('这不是有效的光曜塑肤备份文件')
  }

  await db.transaction(
    'rw',
    [db.appointments, db.customers, db.ledgerEntries],
    async () => {
      await Promise.all([
        db.appointments.clear(),
        db.customers.clear(),
        db.ledgerEntries.clear()
      ])
      await db.appointments.bulkAdd(parsed.appointments)
      await db.customers.bulkAdd(parsed.customers)
      await db.ledgerEntries.bulkAdd(parsed.ledgerEntries)
    }
  )
}
