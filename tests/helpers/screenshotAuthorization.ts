const AUTHORIZED_VALUES = new Set(['1', 'true', 'yes', 'authorized'])

export function isScreenshotAutomationAuthorized() {
  const rawValue = (process.env.ALLOW_SCREENSHOT_AUTOMATION ?? '').trim().toLowerCase()
  return AUTHORIZED_VALUES.has(rawValue)
}

export function screenshotAuthorizationMessage(source: string) {
  return `Screenshot generation is blocked for ${source}. Set ALLOW_SCREENSHOT_AUTOMATION=1 to authorize this run.`
}

export function skipScreenshotSuiteUnlessAuthorized(
  testApi: { skip: (condition: boolean, description: string) => void },
  source: string
) {
  testApi.skip(!isScreenshotAutomationAuthorized(), screenshotAuthorizationMessage(source))
}