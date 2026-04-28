import type { LogLevel, LogEntry, Transport, LoggerOptions, Logger, SamplingRate } from './types.js';
import { LOG_LEVELS } from './types.js';
import { createRedactor, getDefaultRedactor } from './redact.js';
import { consoleTransport } from './transports.js';

function getEnvVar(name: string): string | undefined {
  try {
    if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
      const proc = (globalThis as Record<string, unknown>).process as { env?: Record<string, string | undefined> };
      return proc.env?.[name];
    }
  } catch { /* browser or edge runtime */ }
  return undefined;
}

function resolveLevel(): LogLevel | undefined {
  const level = getEnvVar('LOG_LEVEL');
  if (level) {
    const envLevel = level.toLowerCase() as LogLevel;
    if (envLevel in LOG_LEVELS) return envLevel;
  }
  return undefined;
}

function isPrettyDefault(): boolean {
  return getEnvVar('NODE_ENV') === 'development';
}

function getSampleRate(sampling: SamplingRate | undefined, level: LogLevel): number {
  if (sampling === undefined) return 1;
  if (typeof sampling === 'number') return sampling;
  const rate = sampling[level as Exclude<LogLevel, 'silent'>];
  return rate === undefined ? 1 : rate;
}

function isSampledOut(sampling: SamplingRate | undefined, level: LogLevel): boolean {
  const rate = getSampleRate(sampling, level);
  if (rate >= 1) return false;
  if (rate <= 0) return true;
  return Math.random() >= rate;
}

export function createLogger(options: LoggerOptions): Logger {
  const {
    name,
    level = resolveLevel() ?? 'info',
    pretty = isPrettyDefault(),
    redact = true,
    transports = [consoleTransport(pretty)],
    sampling,
  } = options;

  let minLevel = LOG_LEVELS[level];
  const redactor = redact === false
    ? null
    : Array.isArray(redact)
      ? createRedactor(redact)
      : getDefaultRedactor();

  function getMinLevel(): number {
    return minLevel;
  }

  function log(
    logLevel: LogLevel,
    msg: string,
    data?: Record<string, unknown>,
    context?: Record<string, unknown>,
    levelOverride?: () => number,
    samplingOverride?: SamplingRate,
  ): void {
    const effectiveLevel = levelOverride ? levelOverride() : getMinLevel();
    if (LOG_LEVELS[logLevel] < effectiveLevel) return;

    const effectiveSampling = samplingOverride ?? sampling;
    if (isSampledOut(effectiveSampling, logLevel)) return;

    let extra: Record<string, unknown> = { ...context, ...data };
    if (redactor && Object.keys(extra).length > 0) {
      extra = redactor(extra);
    }

    const entry: LogEntry = {
      level: logLevel,
      name,
      msg,
      ts: new Date().toISOString(),
      ...extra,
    };

    for (const transport of transports) {
      try {
        transport(entry);
      } catch {
        /* transport errors must not crash the app or block other transports */
      }
    }
  }

  function createChild(
    parentContext: Record<string, unknown>,
    parentGetLevel: () => number,
    parentSampling: SamplingRate | undefined,
  ): Logger {
    let ownLevel: number | undefined;

    function childGetLevel(): number {
      return ownLevel ?? parentGetLevel();
    }

    return {
      trace: (msg, data) => log('trace', msg, data, parentContext, childGetLevel, parentSampling),
      debug: (msg, data) => log('debug', msg, data, parentContext, childGetLevel, parentSampling),
      info: (msg, data) => log('info', msg, data, parentContext, childGetLevel, parentSampling),
      warn: (msg, data) => log('warn', msg, data, parentContext, childGetLevel, parentSampling),
      error: (msg, data) => log('error', msg, data, parentContext, childGetLevel, parentSampling),
      fatal: (msg, data) => log('fatal', msg, data, parentContext, childGetLevel, parentSampling),
      child: (childContext) => createChild({ ...parentContext, ...childContext }, childGetLevel, parentSampling),
      setLevel: (newLevel: LogLevel) => { ownLevel = LOG_LEVELS[newLevel]; },
    };
  }

  return {
    trace: (msg, data) => log('trace', msg, data),
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    fatal: (msg, data) => log('fatal', msg, data),
    child: (context) => createChild(context, getMinLevel, sampling),
    setLevel: (newLevel: LogLevel) => { minLevel = LOG_LEVELS[newLevel]; },
  };
}
