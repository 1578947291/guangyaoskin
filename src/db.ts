import Dexie, { type EntityTable } from 'dexie'
import type { Appointment, CustomerRecord, LedgerEntry } from './types'

class GuangYaoDatabase extends Dexie {
  appointments!: EntityTable<Appointment, 'id'>
  customers!: EntityTable<CustomerRecord, 'id'>
  ledgerEntries!: EntityTable<LedgerEntry, 'id'>

  constructor() {
    super('GuangYaoSkinDatabase')
    this.version(1).stores({
      appointments: 'id, scheduledAt, status, createdAt',
      customers: 'id, name, phone, createdAt',
      ledgerEntries: 'id, occurredAt, kind, createdAt'
    })
  }
}

export const db = new GuangYaoDatabase()
