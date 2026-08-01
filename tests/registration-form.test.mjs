import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const registration = await readFile(new URL('../src/features/RegistrationPage.tsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')

test('registration requires name and WeChat while phone remains optional', () => {
  assert.match(registration, /if \(!name\.trim\(\) \|\| !wechatId\.trim\(\)\)/)
  assert.match(registration, /id="registration-phone" value=\{phone\}/)
  assert.doesNotMatch(registration, /id="registration-phone" required/)
  assert.match(registration, /电话<small>选填<\/small>/)
  assert.match(registration, /className="data-form registration-form" onSubmit=\{submit\} noValidate/)
})

test('registration modal groups fields without overlaying its actions', () => {
  assert.match(registration, /className="registration-modal"/)
  assert.equal((registration.match(/className="registration-form-section/g) || []).length, 3)
  assert.match(styles, /\.registration-form \.form-actions,[\s\S]*position: static/)
  assert.match(styles, /\.registration-form-grid/)
})
