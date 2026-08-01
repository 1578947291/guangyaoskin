import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const manifest = readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')
const backup = readFileSync(new URL('../src/lib/backup.ts', import.meta.url), 'utf8')

test('installed app surfaces use the current name', () => {
  assert.match(html, /apple-mobile-web-app-title" content="凹陷修复"/)
  assert.match(html, /<title>凹陷修复<\/title>/)
  assert.equal(JSON.parse(manifest).name, '凹陷修复')
  assert.equal(JSON.parse(manifest).short_name, '凹陷修复')
})

test('backup restore accepts files created before the app rename', () => {
  assert.match(backup, /payload\.app === '凹陷修复' \|\| payload\.app === '光曜塑肤'/)
  assert.match(backup, /app: '凹陷修复'/)
})
