# Logger with Levels

A modular, highly flexible, and lightweight logging library for Node.js (ES Modules). It supports multiple log levels, configurable formatters (Pretty Print and JSON), and multiple transports (Console and File) with built-in size-based file rotation.

---

## Features

- 📶 **Log Levels**: Support for `DEBUG`, `INFO`, `WARN`, and `ERROR` levels with configurable thresholds.
- 🎨 **Flexible Formatting**: 
  - `pretty`: Human-readable, colorized output for development.
  - `json`: Structured logging for production environments, with automatic stack-trace serialization for `Error` objects.
- 🚚 **Multiple Transports**:
  - `ConsoleTransport`: Logs messages to `stdout` (or `stderr` for `ERROR` level messages).
  - `FileTransport`: Appends logs to files with automatic size-based rotation (e.g., `app.log` -> `app.log.1` -> `app.log.2`).
- ⚙️ **Customizability**: Supports custom formatter functions and transport-specific log levels.
- ⚡ **Zero-Dependency**: Uses standard Node.js libraries and the native test runner.

---

## Installation

As this is a library, you can import it directly into your Node.js project:

```bash
# Clone the repository
git clone https://github.com/Ofc-Pranjal/Logger-with-Levels.git
cd Logger-with-Levels
```

Ensure your `package.json` has `"type": "module"` configured to support ES Modules.

---

## Quick Start

```javascript
import { Logger, ConsoleTransport } from 'logger-with-levels';

// Create a logger instance with a Console transport
const logger = new Logger({
  level: 'DEBUG', // Minimum active log level
  transports: [
    new ConsoleTransport()
  ]
});

logger.debug('Testing debug level', { code: 101 });
logger.info('User logged in successfully', { userId: 123 });
logger.warn('Low disk space warning');
logger.error('Database connection failed', new Error('Connection timeout'));
```

---

## Log Levels

The priority hierarchy is as follows:
`DEBUG` (0) < `INFO` (1) < `WARN` (2) < `ERROR` (3)

When a log level is configured globally or on a transport, any message with a lower priority than the configured level will be filtered out.

### Dynamic Level Updating
You can dynamically modify the logger's active level at runtime:

```javascript
logger.setLevel('WARN');
logger.info('This will NOT be logged'); // Ignored
logger.warn('This WILL be logged');     // Active
```

---

## Configuration & Custom Transports

You can configure different formats and levels for individual transports:

```javascript
import { Logger, ConsoleTransport, FileTransport, jsonFormatter, prettyFormatter } from 'logger-with-levels';

const logger = new Logger({
  // Global options
  level: 'DEBUG',
  format: 'pretty', // default global format fallback
  
  transports: [
    // 1. Console Transport (pretty and colorized logs)
    new ConsoleTransport({
      level: 'DEBUG', // Logs everything starting from DEBUG
      formatter: (info) => prettyFormatter(info, { colorize: true })
    }),
    
    // 2. File Transport (structured JSON logs)
    new FileTransport({
      level: 'INFO',  // Logs INFO, WARN, and ERROR
      filename: './logs/app.log',
      maxSize: 5 * 1024 * 1024, // Rotate when file size exceeds 5MB
      maxFiles: 5,              // Keep up to 5 rotated backup files
      formatter: jsonFormatter
    })
  ]
});
```

---

## Running Tests

We use Node.js's built-in test runner. To execute the test suite:

```bash
npm test
```

---

## License

ISC License.
