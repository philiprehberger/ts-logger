# @philiprehberger/ts-logger

[![CI](https://github.com/philiprehberger/ts-logger/actions/workflows/publish.yml/badge.svg)](https://github.com/philiprehberger/ts-logger/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/ts-logger.svg)](https://www.npmjs.com/package/@philiprehberger/ts-logger)
[![License](https://img.shields.io/github/license/philiprehberger/ts-logger)](LICENSE)

Structured JSON logger with child loggers, redaction, and pretty dev output.

## Installation

```bash
npm install @philiprehberger/ts-logger
```

## Usage

### Basic

```ts
import { createLogger } from '@philiprehberger/ts-logger';

const logger = createLogger({ name: 'api', level: 'info' });

logger.info('Server started', { port: 3000 });
// {"level":"info","name":"api","msg":"Server started","port":3000,"ts":"2026-03-09T..."}

logger.error('Request failed', { status: 500, path: '/api/users' });
```

### Log Levels

`trace` → `debug` → `info` → `warn` → `error` → `fatal` → `silent`

Messages below the configured level are silently dropped. Use `silent` to disable all output (useful in tests).

### Child Loggers

```ts
const reqLogger = logger.child({ requestId: 'abc-123' });
reqLogger.info('Processing request');
// {"level":"info","name":"api","msg":"Processing request","requestId":"abc-123","ts":"..."}

const dbLogger = reqLogger.child({ service: 'database' });
// Inherits requestId + adds service
```

### Auto-Redaction

Sensitive fields are automatically masked:

```ts
logger.info('Auth', { token: 'secret123', user: 'alice' });
// {"level":"info","name":"api","msg":"Auth","token":"[REDACTED]","user":"alice","ts":"..."}
```

Default redacted patterns: `password`, `token`, `secret`, `authorization`, `cookie`, `key`, `credential`, `api_key`, `access_token`, `refresh_token`, `private_key`.

Custom patterns:

```ts
const logger = createLogger({
  name: 'app',
  redact: ['ssn', 'credit_card', 'password'],
});
```

Arrays are redacted recursively:

```ts
logger.info('Users', { users: [{ name: 'alice', token: 'abc' }] });
// token is redacted inside the array element
```

Circular references are handled safely:

```ts
const obj: any = { name: 'test' };
obj.self = obj;
logger.info('Circular', obj);
// self becomes "[Circular]"
```

Disable redaction:

```ts
const logger = createLogger({ name: 'app', redact: false });
```

### Pretty Mode

Auto-detected in development (`NODE_ENV=development`), or set manually:

```ts
const logger = createLogger({ name: 'app', pretty: true });
// INFO  [app] Server started {"port":3000}
```

### Runtime Level Changes

```ts
const logger = createLogger({ name: 'app', level: 'info' });
logger.debug('hidden'); // dropped

logger.setLevel('debug');
logger.debug('now visible'); // logged

// Child loggers inherit the parent's level unless they set their own
const child = logger.child({ req: '123' });
logger.setLevel('error'); // child also uses 'error' now
child.setLevel('debug');  // child overrides to 'debug'
```

### Environment Variables

- `LOG_LEVEL` — sets the log level (overrides constructor option, case-insensitive)
- `NODE_ENV=development` — enables pretty mode by default

### Custom Colors

```ts
import { consoleTransport } from '@philiprehberger/ts-logger';

const transport = consoleTransport({
  pretty: true,
  colors: { error: '\x1b[41m', info: '\x1b[36m' },
});
```


## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
