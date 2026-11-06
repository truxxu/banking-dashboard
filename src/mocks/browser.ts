import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * Starts the mock API. The service worker file lives in /public, so on GitHub
 * Pages it is served under the repo sub-path — hence BASE_URL.
 */
export function startMockApi() {
  const base = import.meta.env.BASE_URL
  return worker.start({
    serviceWorker: { url: `${base}mockServiceWorker.js`, options: { scope: base } },
    onUnhandledFrame: 'bypass',
    quiet: import.meta.env.PROD,
  })
}
