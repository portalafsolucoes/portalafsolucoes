import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFilePath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(currentFilePath), '..')

test('criticality API route is explicitly dynamic', () => {
  const routeSource = readFileSync(
    path.join(repoRoot, 'src/app/api/criticality/route.ts'),
    'utf8'
  )

  assert.match(routeSource, /export const dynamic = 'force-dynamic'/)
  assert.match(routeSource, /export async function GET/)
})

test('dashboard page is explicitly dynamic', () => {
  const pageSource = readFileSync(
    path.join(repoRoot, 'src/app/dashboard/page.tsx'),
    'utf8'
  )

  assert.match(pageSource, /export const dynamic = 'force-dynamic'/)
})
