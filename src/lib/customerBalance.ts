import type { CustomerRecord } from '../types'

export function customerTotalQuote(customer: CustomerRecord) {
  return customer.totalQuote ?? customer.amount ?? 0
}

export function customerRequiredSessions(customer: CustomerRecord) {
  return customer.requiredSessions ?? customer.sessions ?? 0
}

export function customerOutstandingBalance(customer: CustomerRecord) {
  return customer.outstandingBalance ?? customerTotalQuote(customer)
}

export function customerRemainingSessions(customer: CustomerRecord) {
  return customer.remainingSessions ?? customerRequiredSessions(customer)
}

export function customerBookedSessions(customer: CustomerRecord) {
  return Math.max(0, customerRequiredSessions(customer) - customerRemainingSessions(customer))
}

export function consumeCustomerBalance(customer: CustomerRecord, amount: number, sessionsUsed: number) {
  return {
    outstandingBalance: Math.max(0, customerOutstandingBalance(customer) - amount),
    remainingSessions: Math.max(0, customerRemainingSessions(customer) - sessionsUsed)
  }
}

export function restoreCustomerBalance(customer: CustomerRecord, amount: number, sessionsUsed: number) {
  return {
    outstandingBalance: Math.min(customerTotalQuote(customer), customerOutstandingBalance(customer) + amount),
    remainingSessions: Math.min(customerRequiredSessions(customer), customerRemainingSessions(customer) + sessionsUsed)
  }
}
