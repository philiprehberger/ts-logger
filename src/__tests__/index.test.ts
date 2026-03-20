import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, consoleTransport, createRedactor, LOG_LEVELS } from '../../dist/index.js';

describe('LOG_LEVELS', () => {
  it('silent is the highest level', () => {
    const values = Object.values(LOG_LEVELS);
    assert.equal(LOG_LEVELS.silent, Math.max(...values));
  });

  it('has correct ordering', () => {
    assert.ok(LOG_LEVELS.trace < LOG_LEVELS.debug);
    assert.ok(LOG_LEVELS.debug < LOG_LEVELS.info);
    assert.ok(LOG_LEVELS.info < LOG_LEVELS.warn);
    assert.ok(LOG_LEVELS.warn < LOG_LEVELS.error);
    assert.ok(LOG_LEVELS.error < LOG_LEVELS.fatal);
    assert.ok(LOG_LEVELS.fatal < LOG_LEVELS.silent);
  });
});

describe('Log level filtering', () => {
  it('drops messages below the configured level', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'warn',
      transports: [(entry) => entries.push(entry)],
    });

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    assert.equal(entries.length, 3);
    assert.deepEqual(entries.map((e) => e.level), ['warn', 'error', 'fatal']);
  });

  it('allows all messages at trace level', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'trace',
      transports: [(entry) => entries.push(entry)],
    });

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    assert.equal(entries.length, 6);
  });
});

describe('silent level', () => {
  it('suppresses all output', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'silent',
      transports: [(entry) => entries.push(entry)],
    });

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    assert.equal(entries.length, 0);
  });
});

describe('Custom transports', () => {
  it('receive correct LogEntry structure', () => {
    const entries = [];
    const logger = createLogger({
      name: 'app',
      level: 'info',
      redact: false,
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('hello', { userId: 42 });

    assert.equal(entries.length, 1);
    const entry = entries[0];
    assert.equal(entry.level, 'info');
    assert.equal(entry.name, 'app');
    assert.equal(entry.msg, 'hello');
    assert.equal(entry.userId, 42);
    assert.ok(typeof entry.ts === 'string');
    // ts should be ISO format
    assert.ok(!isNaN(Date.parse(entry.ts)));
  });
});

describe('Redaction', () => {
  it('redacts default sensitive fields', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: true,
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('login', { password: 'secret123', username: 'alice' });

    const entry = entries[0];
    assert.equal(entry.password, '[REDACTED]');
    assert.equal(entry.username, 'alice');
  });

  it('redacts custom patterns', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: ['ssn', 'dob'],
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('user', { ssn: '123-45-6789', dob: '1990-01-01', name: 'Bob' });

    const entry = entries[0];
    assert.equal(entry.ssn, '[REDACTED]');
    assert.equal(entry.dob, '[REDACTED]');
    assert.equal(entry.name, 'Bob');
  });

  it('does not redact when disabled', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: false,
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('login', { password: 'secret123' });
    assert.equal(entries[0].password, 'secret123');
  });

  it('redacts nested objects', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: true,
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('nested', { auth: { token: 'abc', user: 'alice' } });
    assert.equal(entries[0].auth.token, '[REDACTED]');
    assert.equal(entries[0].auth.user, 'alice');
  });
});

describe('Child logger', () => {
  it('inherits parent context', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: false,
      transports: [(entry) => entries.push(entry)],
    });

    const child = logger.child({ requestId: 'abc-123' });
    child.info('request started');

    assert.equal(entries[0].requestId, 'abc-123');
    assert.equal(entries[0].msg, 'request started');
  });

  it('merges child context with data', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: false,
      transports: [(entry) => entries.push(entry)],
    });

    const child = logger.child({ requestId: 'abc' });
    child.info('done', { status: 200 });

    assert.equal(entries[0].requestId, 'abc');
    assert.equal(entries[0].status, 200);
  });

  it('data overrides context for same key', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: false,
      transports: [(entry) => entries.push(entry)],
    });

    const child = logger.child({ source: 'parent' });
    child.info('test', { source: 'override' });

    assert.equal(entries[0].source, 'override');
  });

  it('supports nested children', () => {
    const entries = [];
    const logger = createLogger({
      name: 'test',
      level: 'info',
      redact: false,
      transports: [(entry) => entries.push(entry)],
    });

    const child = logger.child({ a: 1 });
    const grandchild = child.child({ b: 2 });
    grandchild.info('deep');

    assert.equal(entries[0].a, 1);
    assert.equal(entries[0].b, 2);
  });
});

describe('LOG_LEVEL env var parsing', () => {
  const originalEnv = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalEnv;
    }
  });

  it('respects LOG_LEVEL env var', () => {
    process.env.LOG_LEVEL = 'error';
    const entries = [];
    const logger = createLogger({
      name: 'test',
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('nope');
    logger.error('yes');

    assert.equal(entries.length, 1);
    assert.equal(entries[0].level, 'error');
  });

  it('is case-insensitive', () => {
    process.env.LOG_LEVEL = 'WARN';
    const entries = [];
    const logger = createLogger({
      name: 'test',
      transports: [(entry) => entries.push(entry)],
    });

    logger.info('nope');
    logger.warn('yes');

    assert.equal(entries.length, 1);
    assert.equal(entries[0].level, 'warn');
  });

  it('falls back to info for invalid values', () => {
    process.env.LOG_LEVEL = 'nonsense';
    const entries = [];
    const logger = createLogger({
      name: 'test',
      transports: [(entry) => entries.push(entry)],
    });

    logger.debug('nope');
    logger.info('yes');

    assert.equal(entries.length, 1);
    assert.equal(entries[0].level, 'info');
  });

  it('supports silent via env var', () => {
    process.env.LOG_LEVEL = 'silent';
    const entries = [];
    const logger = createLogger({
      name: 'test',
      transports: [(entry) => entries.push(entry)],
    });

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    assert.equal(entries.length, 0);
  });
});

describe('Transport error isolation', () => {
  it('one failing transport does not block others', () => {
    const entries = [];
    const failingTransport = () => {
      throw new Error('transport broke');
    };
    const workingTransport = (entry) => entries.push(entry);

    const logger = createLogger({
      name: 'test',
      level: 'info',
      transports: [failingTransport, workingTransport],
    });

    logger.info('hello');

    assert.equal(entries.length, 1);
    assert.equal(entries[0].msg, 'hello');
  });

  it('does not throw when all transports fail', () => {
    const logger = createLogger({
      name: 'test',
      level: 'info',
      transports: [
        () => { throw new Error('fail 1'); },
        () => { throw new Error('fail 2'); },
      ],
    });

    assert.doesNotThrow(() => logger.info('hello'));
  });
});

describe('consoleTransport', () => {
  it('accepts boolean for backward compatibility', () => {
    const transport = consoleTransport(true);
    assert.equal(typeof transport, 'function');
  });

  it('accepts options object with colors', () => {
    const transport = consoleTransport({
      pretty: true,
      colors: { info: '\x1b[34m' },
    });
    assert.equal(typeof transport, 'function');
  });

  it('accepts no arguments', () => {
    const transport = consoleTransport();
    assert.equal(typeof transport, 'function');
  });
});
