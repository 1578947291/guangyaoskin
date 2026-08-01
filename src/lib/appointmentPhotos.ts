import type { Appointment } from '../types'

export function appointmentPhotos(appointment: Pick<Appointment, 'photoDataUrl' | 'photoDataUrls'>) {
  return Array.from(new Set([
    ...(appointment.photoDataUrls || []),
    ...(appointment.photoDataUrl ? [appointment.photoDataUrl] : [])
  ].filter(Boolean)))
}
