# Changelog

## 0.3.4

- Republish under new npm package name

## 0.3.3

- Add Development section to README
- Fix CI badge to reference publish.yml

## 0.3.0
- Add array redaction — sensitive fields inside arrays are now recursively redacted
- Add circular reference protection — circular objects return `"[Circular]"` instead of infinite recursion
- Add `setLevel()` method to change log level at runtime; child loggers inherit parent level unless overridden

## 0.2.0
- Add `silent` log level to fully disable logging
- Fix transport errors crashing the application — transports are now isolated
- Add configurable colors to `consoleTransport` (backward-compatible)
- Add test suite (23 tests)

## 0.1.0
- Initial release
