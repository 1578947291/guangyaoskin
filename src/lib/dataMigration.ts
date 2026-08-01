import type { Appointment, CustomerRecord } from '../types'

function normalizeIdentity(value: string | undefined) {
  return (value || '').trim().toLocaleLowerCase('zh-CN')
}

function findCustomer(appointment: Appointment, customers: CustomerRecord[]) {
  if (appointment.customerId) {
    const linked = customers.find((customer) => customer.id === appointment.customerId)
    if (linked) return linked
  }

  const latestAppointment = customers.find((customer) => customer.appointmentId === appointment.id)
  if (latestAppointment) return latestAppointment

  const wechatId = normalizeIdentity(appointment.wechatId)
  if (wechatId) {
    const byWechat = customers.find((customer) => normalizeIdentity(customer.wechatId) === wechatId)
    if (byWechat) return byWechat
  }

  const name = normalizeIdentity(appointment.nickname || appointment.customerName)
  const phone = normalizeIdentity(appointment.phone)
  return customers.find((customer) => {
    if (!name || normalizeIdentity(customer.name) !== name) return false
    const customerPhone = normalizeIdentity(customer.phone)
    return !phone || !customerPhone || phone === customerPhone
  })
}

export function migrateCustomerRelations(appointments: Appointment[], customerRecords: CustomerRecord[]) {
  const customers = customerRecords.map((customer) => ({ ...customer }))
  const migratedAppointments = appointments.map((source) => {
    const customer = findCustomer(source, customers)
    if (!customer) return { ...source }

    const appointmentPhotos = [
      ...(source.photoDataUrls || []),
      ...(source.photoDataUrl ? [source.photoDataUrl] : [])
    ]
    const customerPhotoList = [
      ...(customer.photoDataUrls || []),
      ...(customer.photoDataUrl ? [customer.photoDataUrl] : []),
      ...appointmentPhotos
    ]
    const uniquePhotos = Array.from(new Set(customerPhotoList.filter(Boolean)))
    customer.photoDataUrl = uniquePhotos[0]
    customer.photoDataUrls = uniquePhotos.length ? uniquePhotos : undefined

    const { photoDataUrl: _photoDataUrl, photoDataUrls: _photoDataUrls, ...appointment } = source
    return { ...appointment, customerId: customer.id }
  })

  return { appointments: migratedAppointments, customers }
}
