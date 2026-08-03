import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appointmentList = await readFile(new URL('../src/features/AppointmentsPage.tsx', import.meta.url), 'utf8')
const appointmentDetail = await readFile(new URL('../src/features/AppointmentDetailPage.tsx', import.meta.url), 'utf8')
const registrationList = await readFile(new URL('../src/features/RegistrationPage.tsx', import.meta.url), 'utf8')
const customerDetail = await readFile(new URL('../src/features/CustomerDetailPage.tsx', import.meta.url), 'utf8')
const customerPhotos = await readFile(new URL('../src/features/CustomerPhotosPage.tsx', import.meta.url), 'utf8')
const customerLinking = await readFile(new URL('../src/lib/customerAppointments.ts', import.meta.url), 'utf8')
const migration = await readFile(new URL('../src/lib/dataMigration.ts', import.meta.url), 'utf8')
const lightbox = await readFile(new URL('../src/components/PhotoLightbox.tsx', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')

test('appointment list opens a detail page', () => {
  assert.match(appointmentList, /onOpenAppointment\(appointment\.id\)/)
  assert.match(appointmentList, /<AppointmentDetailPage/)
})

test('customer detail previews two photos and delegates management to a secondary page', () => {
  assert.doesNotMatch(appointmentDetail, /detail-gallery-section/)
  assert.doesNotMatch(appointmentDetail, /type="file"/)
  assert.match(customerDetail, /const previewPhotos = photos\.slice\(0, 2\)/)
  assert.match(customerDetail, /onClick=\{onOpenPhotos\}/)
  assert.doesNotMatch(customerDetail, /type="file"/)
  assert.match(customerPhotos, /type="file" accept="image\/\*" multiple/)
  assert.match(customerPhotos, /db\.customers\.update\(customer\.id/)
  assert.match(customerPhotos, /const removePhoto = async/)
  assert.match(customerPhotos, /photoDataUrls: nextPhotos/)
  assert.match(customerPhotos, /客户照片已删除/)
})

test('detail profile fields are grouped into one summary panel', () => {
  assert.match(appointmentDetail, /detail-summary-panel surface/)
  assert.match(customerDetail, /detail-summary-panel surface/)
  assert.match(customerDetail, /customerBookedSessions\(customer\)/)
  assert.match(customerDetail, /label="已预约次数"/)
  assert.doesNotMatch(appointmentDetail, /detail-info-item surface/)
  assert.doesNotMatch(customerDetail, /detail-info-item surface/)
})

test('photos open in a full-screen keyboard accessible viewer', () => {
  assert.match(lightbox, /className="photo-lightbox" role="dialog" aria-modal="true"/)
  assert.match(lightbox, /event\.key === 'Escape'/)
  assert.match(lightbox, /event\.key === 'ArrowLeft'/)
  assert.match(lightbox, /event\.key === 'ArrowRight'/)
  assert.match(customerPhotos, /<PhotoLightbox/)
})

test('registration list opens customer detail and its appointments', () => {
  assert.match(registrationList, /onOpenCustomer\(customer\.id\)/)
  assert.match(registrationList, /<CustomerDetailPage/)
  assert.match(registrationList, /notify=\{notify\}/)
  assert.match(registrationList, /<CustomerPhotosPage/)
  assert.match(customerDetail, /customerAppointments\(customer, appointments\)/)
  assert.match(customerDetail, /onOpenAppointment\(appointment\.id\)/)
  assert.match(customerDetail, /<AppointmentDetailPage/)
})

test('customer detail can edit customer profile and recalculates balance fields', () => {
  assert.match(customerDetail, /const \[editOpen, setEditOpen\] = useState\(false\)/)
  assert.match(customerDetail, /编辑用户资料/)
  assert.match(customerDetail, /电话<small>选填<\/small>/)
  assert.match(customerDetail, /nextTotalQuote < paidAmount/)
  assert.match(customerDetail, /nextRequiredSessions < bookedSessions/)
  assert.match(customerDetail, /db\.customers\.update\(customer\.id/)
  assert.match(customerDetail, /outstandingBalance: nextTotalQuote - paidAmount/)
  assert.match(customerDetail, /remainingSessions: nextRequiredSessions - bookedSessions/)
  assert.match(customerDetail, /用户资料已更新/)
})

test('detail pages use independent hash routes with safe back fallbacks', () => {
  assert.match(app, /#appointments\/\$\{encodeURIComponent\(appointmentId\)\}/)
  assert.match(app, /#registration\/\$\{encodeURIComponent\(customerId\)\}/)
  assert.match(app, /window\.history\.pushState/)
  assert.match(app, /state\.from === fallbackHash/)
  assert.match(app, /window\.history\.replaceState/)
  assert.match(app, /#finance\/summary/)
  assert.match(app, /#registration\/\$\{encodeURIComponent\(customerId\)\}\/photos/)
  assert.doesNotMatch(app, /hidden=\{route\.section/)
})

test('customer appointment linking prefers customer id and keeps legacy identity fallback', () => {
  assert.match(customerLinking, /appointment\.customerId === customer\.id/)
  assert.match(customerLinking, /customer\.appointmentId === appointment\.id/)
  assert.match(customerLinking, /wechatId === appointmentWechatId/)
})

test('database migration moves legacy appointment photos onto customers', () => {
  assert.match(migration, /migrateCustomerRelations/)
  assert.match(migration, /customer\.photoDataUrls = uniquePhotos/)
  assert.match(migration, /customerId: customer\.id/)
  assert.match(migration, /migrateCustomerBalances/)
  assert.match(migration, /outstandingBalance: customer\.outstandingBalance \?\? Math\.max\(0, totalQuote - paidAmount\)/)
  assert.match(migration, /remainingSessions: customer\.remainingSessions \?\? Math\.max\(0, requiredSessions - usedSessions\)/)
})

test('primary pages confirm exit while secondary pages use history back', () => {
  assert.match(app, /guangYaoExitGuard/)
  assert.match(app, /确定退出凹陷修复吗/)
  assert.match(app, /window\.history\.forward\(\)/)
  assert.match(app, /state\.from === fallbackHash/)
  assert.doesNotMatch(app, /beforeunload/)
})
