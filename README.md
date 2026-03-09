# @philiprehberger/ts-logger

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

`trace` → `debug` → `info` → `warn` → `error` → `fatal`

Messages below the configured level are silently dropped.

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

### Environment Variables

- `LOG_LEVEL` — sets the log level (overrides constructor option)
- `NODE_ENV=development` — enables pretty mode by default

## License

MIT
