import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const sourceRoot = fileURLToPath(new URL('../src', import.meta.url))

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.name.endsWith('.tsx') ? [path] : []
  }))
  return nested.flat()
}

test('all application icons use the centralized cute emoji system', async () => {
  const files = await sourceFiles(sourceRoot)
  const sources = await Promise.all(files.map((path) => readFile(path, 'utf8')))
  const combined = sources.join('\n')
  assert.doesNotMatch(combined, /lucide-react/)
  assert.match(combined, /export function CuteIcon/)
  assert.match(combined, /cat: '😺'/)
  assert.match(combined, /delete: '🗑️'/)
  assert.match(combined, /imageAdd: '🌄'/)
})
