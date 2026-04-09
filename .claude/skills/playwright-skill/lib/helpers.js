const { chromium, firefox, webkit } = require('playwright')
const http = require('http')

function getExtraHeadersFromEnv() {
  const headerName = process.env.PW_HEADER_NAME
  const headerValue = process.env.PW_HEADER_VALUE

  if (headerName && headerValue) {
    return { [headerName]: headerValue }
  }

  return null
}

async function launchBrowser(browserType = 'chromium', options = {}) {
  const browsers = { chromium, firefox, webkit }
  const browser = browsers[browserType]

  if (!browser) {
    throw new Error(`Invalid browser type: ${browserType}`)
  }

  return browser.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...options
  })
}

async function createContext(browser, options = {}) {
  const envHeaders = getExtraHeadersFromEnv()
  const mergedHeaders = {
    ...envHeaders,
    ...options.extraHTTPHeaders
  }

  return browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    timezoneId: 'America/Sao_Paulo',
    ...(Object.keys(mergedHeaders).length > 0 ? { extraHTTPHeaders: mergedHeaders } : {}),
    ...options
  })
}

async function detectDevServers(customPorts = []) {
  const commonPorts = [3000, 3001, 3002, 5173, 8080, 8000, 4200, 5000, 9000, 1234]
  const allPorts = [...new Set([...commonPorts, ...customPorts])]
  const detectedServers = []

  for (const port of allPorts) {
    await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port,
          path: '/',
          method: 'HEAD',
          timeout: 500
        },
        (res) => {
          if (res.statusCode < 500) {
            detectedServers.push(`http://localhost:${port}`)
          }
          resolve()
        }
      )

      req.on('error', () => resolve())
      req.on('timeout', () => {
        req.destroy()
        resolve()
      })
      req.end()
    })
  }

  return detectedServers
}

module.exports = {
  createContext,
  detectDevServers,
  getExtraHeadersFromEnv,
  launchBrowser
}