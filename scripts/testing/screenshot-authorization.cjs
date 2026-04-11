const AUTHORIZED_VALUES = new Set(['1', 'true', 'yes', 'authorized'])

function isScreenshotAutomationAuthorized() {
  const rawValue = (process.env.ALLOW_SCREENSHOT_AUTOMATION ?? '').trim().toLowerCase()
  return AUTHORIZED_VALUES.has(rawValue)
}

function screenshotAuthorizationMessage(source) {
  return `Screenshot generation is blocked for ${source}. Set ALLOW_SCREENSHOT_AUTOMATION=1 to authorize this run.`
}

function ensureScreenshotAutomationAuthorized(source) {
  if (!isScreenshotAutomationAuthorized()) {
    throw new Error(screenshotAuthorizationMessage(source))
  }
}

module.exports = {
  ensureScreenshotAutomationAuthorized,
  isScreenshotAutomationAuthorized,
  screenshotAuthorizationMessage,
}