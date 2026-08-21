/**
 * Disable console logging in production
 * Prevents sensitive information leakage through browser console
 */

export function disableConsoleInProduction() {
  if (import.meta.env.PROD) {
    // Override console methods
    const noop = () => {};
    window.console.log = noop;
    window.console.warn = noop;
    window.console.info = noop;
    window.console.debug = noop;
    // Keep error for critical issues
    // window.console.error = noop;
  }
}
