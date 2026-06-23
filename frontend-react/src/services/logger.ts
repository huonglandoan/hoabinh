// Simple logging wrapper so we can replace implementation project-wide later.
const isDev = ((globalThis as any)?.process?.env?.NODE_ENV ?? 'development') !== 'production';

export const logger = {
  error: (...args: any[]) => {
    // In production, this could be forwarded to a remote logging service.
    // Keep console output for now but centralised.
    // eslint-disable-next-line no-console
    console.error(...args);
  },
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
  info: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.info(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
};

export default logger;
