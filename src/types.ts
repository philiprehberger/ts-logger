export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export interface LogEntry {
  level: LogLevel;
  name: string;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

export type Transport = (entry: LogEntry) => void;

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  pretty?: boolean;
  redact?: string[] | boolean;
  transports?: Transport[];
}

export interface Logger {
  trace(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  fatal(msg: string, data?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
}
