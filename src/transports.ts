import type { LogEntry, LogLevel } from './types.js';

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};
const RESET = '\x1b[0m';

export function consoleTransport(pretty: boolean) {
  return (entry: LogEntry): void => {
    if (pretty) {
      const { level, name, msg, ts, ...rest } = entry;
      const color = LEVEL_COLORS[level] || '';
      const extra = Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';
      const method = level === 'error' || level === 'fatal' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](`${color}${level.toUpperCase().padEnd(5)}${RESET} [${name}] ${msg}${extra}`);
    } else {
      const method = entry.level === 'error' || entry.level === 'fatal' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
      console[method](JSON.stringify(entry));
    }
  };
}
