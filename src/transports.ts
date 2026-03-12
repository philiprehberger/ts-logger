import type { LogEntry, LogLevel } from './types.js';

const DEFAULT_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
  silent: '',
};
const RESET = '\x1b[0m';

export interface ConsoleTransportOptions {
  pretty?: boolean;
  colors?: Partial<Record<LogLevel, string>>;
}

export function consoleTransport(opts?: boolean | ConsoleTransportOptions) {
  let pretty: boolean;
  let colors: Record<LogLevel, string>;

  if (typeof opts === 'boolean' || opts === undefined) {
    pretty = opts ?? false;
    colors = { ...DEFAULT_COLORS };
  } else {
    pretty = opts.pretty ?? false;
    colors = { ...DEFAULT_COLORS, ...opts.colors };
  }

  return (entry: LogEntry): void => {
    if (pretty) {
      const { level, name, msg, ts, ...rest } = entry;
      const color = colors[level] || '';
      const extra = Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';
      const method = level === 'error' || level === 'fatal' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](`${color}${level.toUpperCase().padEnd(5)}${RESET} [${name}] ${msg}${extra}`);
    } else {
      const method = entry.level === 'error' || entry.level === 'fatal' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
      console[method](JSON.stringify(entry));
    }
  };
}
