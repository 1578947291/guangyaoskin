export type AppSection = 'home' | 'appointments' | 'registration' | 'finance'

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled'

export type AppointmentService = 'experience' | 'full-face'

export interface Appointment {
  id: string
  customerName: string
  phone: string
  serviceName: string
  scheduledAt: string
  notes: string
  status: AppointmentStatus
  createdAt: string
  nickname?: string
  wechatId?: string
  wechatName?: string
  appointmentType?: AppointmentService
  amount?: number
  photoDataUrl?: string
}

export interface CustomerRecord {
  id: string
  name: string
  phone: string
  skinNotes: string
  lastVisitAt?: string
  createdAt: string
  wechatId?: string
  serviceType?: AppointmentService
  amount?: number
  sessions?: number
  repairDate?: string
  photoDataUrl?: string
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
  appointmentId?: string
}

export type Notify = (message: string) => void
