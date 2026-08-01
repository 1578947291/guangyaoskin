import type { Appointment, CustomerRecord } from '../types'

function normalizeIdentity(value: string | undefined) {
  return (value || '').trim().toLocaleLowerCase('zh-CN')
}

export function customerAppointments(customer: CustomerRecord, appointments: Appointment[]) {
  const wechatId = normalizeIdentity(customer.wechatId)
  const name = normalizeIdentity(customer.name)
  const phone = normalizeIdentity(customer.phone)

  return appointments
    .filter((appointment) => {
      if (appointment.customerId === customer.id) return true
      if (customer.appointmentId === appointment.id) return true
      const appointmentWechatId = normalizeIdentity(appointment.wechatId)
      if (wechatId && appointmentWechatId) return wechatId === appointmentWechatId
      if (wechatId || appointmentWechatId) return false

      const sameName = name && normalizeIdentity(appointment.nickname || appointment.customerName) === name
      const appointmentPhone = normalizeIdentity(appointment.phone)
      return Boolean(sameName && (!phone || !appointmentPhone || phone === appointmentPhone))
    })
    .sort((first, second) => second.scheduledAt.localeCompare(first.scheduledAt))
}
