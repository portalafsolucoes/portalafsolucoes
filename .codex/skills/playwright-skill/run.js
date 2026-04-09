#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

process.chdir(__dirname)

function checkPlaywrightInstalled() {
  try {
    require.resolve('playwright')
    return true
  } catch {
    return false
  }
}

function installPlaywright() {
  console.log('Playwright not found. Installing...')
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname })
    execSync('npx playwright install chromium', { stdio: 'inherit', cwd: __dirname })
    console.log('Playwright installed successfully')
    return true
  } catch (error) {
    console.error('Failed to install Playwright:', error.message)
    return false
  }
}

function getCodeToExecute() {
  const args = process.argv.slice(2)

  if (args.length > 0 && fs.existsSync(args[0])) {
    return fs.readFileSync(path.resolve(args[0]), 'utf8')
  }

  if (args.length > 0) {
    return args.join(' ')
  }

  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf8')
  }

  console.error('No code to execute')
  process.exit(1)
}

function cleanupOldTempFiles() {
  try {
    for (const file of fs.readdirSync(__dirname)) {
      if (file.startsWith('.temp-execution-') && file.endsWith('.js')) {
        try {
          fs.unlinkSync(path.join(__dirname, file))
        } catch {
        }
      }
    }
  } catch {
  }
}

function wrapCodeIfNeeded(code) {
  if (code.includes('require(') && (code.includes('(async () => {') || code.includes('(async()=>{'))) {
    return code
  }

  return `
const { chromium, firefox, webkit, devices } = require('playwright')
const helpers = require('./lib/helpers')

(async () => {
  try {
    ${code}
  } catch (error) {
    console.error(error.stack || error.message)
    process.exit(1)
  }
})()
`
}

async function main() {
  cleanupOldTempFiles()

  if (!checkPlaywrightInstalled() && !installPlaywright()) {
    process.exit(1)
  }

  const tempFile = path.join(__dirname, `.temp-execution-${Date.now()}.js`)
  fs.writeFileSync(tempFile, wrapCodeIfNeeded(getCodeToExecute()), 'utf8')
  require(tempFile)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})