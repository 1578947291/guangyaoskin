import type { CustomerRecord } from '../types'

export function customerPhotos(customer: Pick<CustomerRecord, 'photoDataUrl' | 'photoDataUrls'>) {
  return Array.from(new Set([
    ...(customer.photoDataUrls || []),
    ...(customer.photoDataUrl ? [customer.photoDataUrl] : [])
  ].filter(Boolean)))
}
