import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appointmentList = await readFile(new URL('../src/features/AppointmentsPage.tsx', import.meta.url), 'utf8')
const appointmentDetail = await readFile(new URL('../src/features/AppointmentDetailPage.tsx', import.meta.url), 'utf8')
const registrationList = await readFile(new URL('../src/features/RegistrationPage.tsx', import.meta.url), 'utf8')
const customerDetail = await readFile(new URL('../src/features/CustomerDetailPage.tsx', import.meta.url), 'utf8')
const customerLinking = await readFile(new URL('../src/lib/customerAppointments.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')

test('appointment list opens a detail page', () => {
  assert.match(appointmentList, /onOpenAppointment\(appointment\.id\)/)
  assert.match(appointmentList, /<AppointmentDetailPage/)
})

test('appointment detail supports multiple photos after completion', () => {
  assert.match(appointmentDetail, /type="file" accept="image\/\*" multiple/)
  assert.match(appointmentDetail, /photoDataUrls: nextPhotos/)
  assert.match(appointmentDetail, /订单已完成，仍可继续关联护理后的照片/)
  assert.doesNotMatch(appointmentDetail, /appointment\.status !== 'completed'/)
})

test('detail profile fields are grouped into one summary panel', () => {
  assert.match(appointmentDetail, /detail-summary-panel surface/)
  assert.match(customerDetail, /detail-summary-panel surface/)
  assert.doesNotMatch(appointmentDetail, /detail-info-item surface/)
  assert.doesNotMatch(customerDetail, /detail-info-item surface/)
})

test('photos open in a full-screen keyboard accessible viewer', () => {
  assert.match(appointmentDetail, /className="photo-lightbox" role="dialog" aria-modal="true"/)
  assert.match(appointmentDetail, /event\.key === 'Escape'/)
  assert.match(appointmentDetail, /event\.key === 'ArrowLeft'/)
  assert.match(appointmentDetail, /event\.key === 'ArrowRight'/)
})

test('registration list opens customer detail and its appointments', () => {
  assert.match(registrationList, /onOpenCustomer\(customer\.id\)/)
  assert.match(registrationList, /<CustomerDetailPage/)
  assert.match(customerDetail, /customerAppointments\(customer, appointments\)/)
  assert.match(customerDetail, /onOpenAppointment\(appointment\.id\)/)
  assert.match(customerDetail, /<AppointmentDetailPage/)
})

test('detail pages use independent hash routes with safe back fallbacks', () => {
  assert.match(app, /#appointments\/\$\{encodeURIComponent\(appointmentId\)\}/)
  assert.match(app, /#registration\/\$\{encodeURIComponent\(customerId\)\}/)
  assert.match(app, /window\.history\.pushState/)
  assert.match(app, /state\.from === fallbackHash/)
  assert.match(app, /window\.history\.replaceState/)
  assert.doesNotMatch(app, /hidden=\{route\.section/)
})

test('customer appointment linking prefers stable ids and WeChat identity', () => {
  assert.match(customerLinking, /customer\.appointmentId === appointment\.id/)
  assert.match(customerLinking, /wechatId === appointmentWechatId/)
})
