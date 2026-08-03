import Dexie, { type EntityTable } from 'dexie'
import { migrateCustomerBalances, migrateCustomerRelations } from './lib/dataMigration'
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
    this.version(2).stores({
      appointments: 'id, scheduledAt, status, createdAt',
      customers: 'id, name, phone, createdAt, repairDate, repairStatus',
      ledgerEntries: 'id, occurredAt, kind, createdAt'
    })
    this.version(3).stores({
      appointments: 'id, customerId, scheduledAt, status, createdAt',
      customers: 'id, name, phone, createdAt, repairDate, repairStatus',
      ledgerEntries: 'id, occurredAt, kind, createdAt'
    }).upgrade(async (transaction) => {
      const appointmentTable = transaction.table<Appointment, string>('appointments')
      const customerTable = transaction.table<CustomerRecord, string>('customers')
      const migrated = migrateCustomerRelations(
        await appointmentTable.toArray(),
        await customerTable.toArray()
      )
      await appointmentTable.bulkPut(migrated.appointments)
      await customerTable.bulkPut(migrated.customers)
    })
    this.version(4).stores({
      appointments: 'id, customerId, scheduledAt, status, createdAt',
      customers: 'id, name, phone, createdAt, repairDate, repairStatus',
      ledgerEntries: 'id, occurredAt, kind, createdAt'
    }).upgrade(async (transaction) => {
      const appointmentTable = transaction.table<Appointment, string>('appointments')
      const customerTable = transaction.table<CustomerRecord, string>('customers')
      await customerTable.bulkPut(migrateCustomerBalances(
        await appointmentTable.toArray(),
        await customerTable.toArray()
      ))
    })
  }
}

export const db = new GuangYaoDatabase()
