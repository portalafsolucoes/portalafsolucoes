import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const failures = []

const rootForbiddenPatterns = [
  /^screenshot-.*\.(png|jpg|jpeg|webp)$/i,
  /^relatorio.*\.(md|html|pdf|json)$/i,
  /^report.*\.(md|html|pdf|json)$/i,
  /^test-plan.*\.md$/i,
]

const allowedAuditoriaRootEntries = new Set(['README.md'])
const dateDirPattern = /^\d{4}-\d{2}-\d{2}$/
const forbiddenAuditoriaNames = [
  /^storageState(?:-.*)?\.json$/i,
  /^error\.log$/i,
  /^.*\.error\.txt$/i,
  /^run-audit\.[^.]+$/i,
  /^run-worker-.*\.[^.]+$/i,
]

function addFailure(message) {
  failures.push(message)
}

function isDirectory(entryPath) {
  return fs.statSync(entryPath).isDirectory()
}

function walk(dirPath, visitor) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)
    visitor(fullPath, entry)
    if (entry.isDirectory()) {
      walk(fullPath, visitor)
    }
  }
}

for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  if (rootForbiddenPatterns.some((pattern) => pattern.test(entry.name))) {
    addFailure(`Arquivo de auditoria solto na raiz: ${entry.name}`)
  }
}

const auditoriaDir = path.join(rootDir, 'auditoria')

if (fs.existsSync(auditoriaDir)) {
  for (const entry of fs.readdirSync(auditoriaDir, { withFileTypes: true })) {
    if (entry.isFile() && !allowedAuditoriaRootEntries.has(entry.name)) {
      addFailure(`Arquivo solto em auditoria/: ${entry.name}`)
      continue
    }

    if (entry.isDirectory() && !dateDirPattern.test(entry.name)) {
      addFailure(`Pasta de primeiro nivel em auditoria/ fora do padrao YYYY-MM-DD: ${entry.name}`)
    }
  }

  walk(auditoriaDir, (fullPath, entry) => {
    if (!entry.isFile()) return

    if (forbiddenAuditoriaNames.some((pattern) => pattern.test(entry.name))) {
      addFailure(`Artefato proibido em auditoria/: ${path.relative(rootDir, fullPath)}`)
    }
  })

  for (const dateEntry of fs.readdirSync(auditoriaDir, { withFileTypes: true })) {
    if (!dateEntry.isDirectory() || !dateDirPattern.test(dateEntry.name)) continue

    const datePath = path.join(auditoriaDir, dateEntry.name)
    for (const runEntry of fs.readdirSync(datePath, { withFileTypes: true })) {
      if (!runEntry.isDirectory()) {
        addFailure(`Arquivo solto dentro de auditoria/${dateEntry.name}: ${runEntry.name}`)
        continue
      }

      const runPath = path.join(datePath, runEntry.name)
      const runReadmePath = path.join(runPath, 'README.md')
      if (!fs.existsSync(runReadmePath) || isDirectory(runReadmePath)) {
        addFailure(`Rodada sem README.md: ${path.relative(rootDir, runPath)}`)
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Falha de higiene do repositorio:\n')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Higiene do repositorio validada com sucesso.')
