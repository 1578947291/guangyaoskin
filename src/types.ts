export type AppSection = 'home' | 'appointments' | 'registration' | 'finance'

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  customerName: string
  phone: string
  serviceName: string
  scheduledAt: string
  notes: string
  status: AppointmentStatus
  createdAt: string
}

export interface CustomerRecord {
  id: string
  name: string
  phone: string
  skinNotes: string
  lastVisitAt?: string
  createdAt: string
}

export type LedgerKind = 'income' | 'expense'

export interface LedgerEntry {
  id: string
  title: string
  amount: number
  kind: LedgerKind
  occurredAt: string
  notes: string
  createdAt: string
}

export type Notify = (message: string) => void
