import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/features/AppointmentsPage.tsx', import.meta.url), 'utf8')
const homeSource = await readFile(new URL('../src/features/HomePage.tsx', import.meta.url), 'utf8')

test('appointment form only selects an existing registered customer', () => {
  assert.match(source, /id="appointment-customer"/)
  assert.match(source, /customers\.map\(\(customer\)/)
  assert.match(source, /className="appointment-customer-options"/)
  assert.match(source, /type="radio" name="appointment-customer"/)
  assert.match(source, /onChange=\{\(\) => setSelectedCustomerId\(customer\.id\)\}/)
  assert.match(source, /customerId: member\.id/)
  assert.doesNotMatch(source, /id="appointment-nickname"/)
  assert.doesNotMatch(source, /id="appointment-wechat-id"/)
  assert.doesNotMatch(source, /db\.customers\.add/)
})

test('appointment notes are editable and persisted', () => {
  assert.match(source, /id="appointment-notes"/)
  assert.match(source, /notes: notes\.trim\(\)/)
  assert.match(source, /appointment-notes[\s\S]*appointment\.notes \|\| '无备注'/)
})

test('appointment submission uses application validation', () => {
  assert.match(source, /<form className="data-form appointment-form" onSubmit=\{submit\} noValidate>/)
  assert.match(source, /const member = customersById\.get\(selectedCustomerId\)/)
  assert.match(source, /notify\('请选择已登记客户'\)/)
})

test('appointment creation redirects to registration when there are no customers', () => {
  assert.match(source, /if \(!customers\.length\)/)
  assert.match(source, /onOpenRegistration\(\)/)
})

test('home repair actions synchronize the linked appointment status', () => {
  assert.match(source, /appointmentId,\n\s+serviceType:/)
  assert.match(homeSource, /db\.transaction\('rw', db\.customers, db\.appointments/)
  assert.match(homeSource, /db\.appointments\.update\(appointment\.id, \{ status \}\)/)
})

test('completed appointments can be cancelled while cancelled appointments are terminal', () => {
  assert.match(source, /completed: \['completed', 'cancelled'\]/)
  assert.match(source, /cancelled: \['cancelled'\]/)
  assert.match(source, /statusTransitions\[appointment\.status\]\.includes\(status\)/)
  assert.match(source, /statusTransitions\[appointment\.status\]\.map/)
  assert.match(source, /appointment\.status === 'cancelled' \? \(/)
  assert.match(source, /status-badge cancelled/)
  assert.match(source, /if \(appointment\?\.status === 'completed'\)/)
})

test('appointment list follows the requested field order', () => {
  assert.match(source, /appointment-time[\s\S]*appointment-name[\s\S]*service-tag[\s\S]*appointment-amount[\s\S]*appointment-photo[\s\S]*appointment-notes/)
})

test('home displays todays date above the metrics', () => {
  assert.match(homeSource, /home-greeting/)
  assert.ok(homeSource.indexOf('home-greeting') < homeSource.indexOf('home-metrics'))
  assert.match(homeSource, /todayDateFormat\.format\(today\)/)
  assert.doesNotMatch(homeSource, /todayTimeFormat/)
})

test('home opening message rotates without immediately repeating', () => {
  assert.match(homeSource, /const motivationalMessages = \[/)
  assert.match(homeSource, /guangyao-home-message-index/)
  assert.match(homeSource, /nextIndex === previousIndex/)
  assert.match(homeSource, /openingMessage\.title/)
  assert.match(homeSource, /openingMessage\.subtitle/)
})

test('appointment calendar is collapsed by default and exposes an accessible toggle', () => {
  assert.match(source, /const \[calendarOpen, setCalendarOpen\] = useState\(false\)/)
  assert.match(source, /aria-expanded=\{calendarOpen\}/)
  assert.match(source, /aria-controls="appointment-calendar-content"/)
  assert.match(source, /calendarOpen \? \(/)
})
