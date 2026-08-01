import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/lib/id.ts', import.meta.url), 'utf8')
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const { createId } = await import(moduleUrl)

test('createId works when randomUUID is unavailable', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues(bytes) {
          bytes.set(Array.from({ length: bytes.length }, (_, index) => index))
          return bytes
        }
      }
    })

    const id = createId()
    assert.equal(id, '00010203-0405-4607-8809-0a0b0c0d0e0f')
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'crypto', originalDescriptor)
    } else {
      delete globalThis.crypto
    }
  }
})

test('feature save paths use the compatible ID helper', async () => {
  const featureUrls = [
    '../src/features/AppointmentsPage.tsx',
    '../src/features/FinancePage.tsx',
    '../src/features/RegistrationPage.tsx'
  ]
  const featureSources = await Promise.all(
    featureUrls.map((url) => readFile(new URL(url, import.meta.url), 'utf8'))
  )

  for (const featureSource of featureSources) {
    assert.doesNotMatch(featureSource, /crypto\.randomUUID\s*\(/)
    assert.match(featureSource, /createId\s*\(/)
  }
})
