import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const modalSource = await readFile(new URL('../src/components/Modal.tsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')

test('modal header and form share one continuous sheet', () => {
  const headerStyles = styles.match(/\.modal-header \{([^}]*)\}/)?.[1] || ''
  assert.match(modalSource, /<div className="modal-body">\{children\}<\/div>/)
  assert.match(headerStyles, /background: transparent;/)
  assert.doesNotMatch(headerStyles, /border-bottom:/)
  assert.match(styles, /\.modal-body \{[\s\S]*overflow-y: auto;/)
})
