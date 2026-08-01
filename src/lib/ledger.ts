import type { Appointment, LedgerEntry } from '../types'

export function ledgerOccurrence(
  entry: LedgerEntry,
  appointmentsById: ReadonlyMap<string, Appointment>
) {
  if (entry.appointmentId) {
    const appointment = appointmentsById.get(entry.appointmentId)
    if (appointment) return appointment.scheduledAt
  }
  return entry.occurredAt
}
