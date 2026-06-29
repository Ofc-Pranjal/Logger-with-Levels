import { test, describe, beforeEach, afterEach, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  Logger,
  ConsoleTransport,
  FileTransport,
  prettyFormatter,
  jsonFormatter
} from '../index.js';

describe('Logger Suite', () => {
  describe('Formatters', () => {
    it('jsonFormatter formats logs into JSON strings', () => {
      const info = {
        timestamp: '2026-06-29T12:00:00.000Z',
        level: 'INFO',
        message: 'Hello World',
        metadata: { user: 'Alice' }
      };

      const result = jsonFormatter(info);
      const parsed = JSON.parse(result);

      assert.strictEqual(parsed.timestamp, '2026-06-29T12:00:00.000Z');
      assert.strictEqual(parsed.level, 'INFO');
      assert.strictEqual(parsed.message, 'Hello World');
      assert.deepStrictEqual(parsed.metadata, { user: 'Alice' });
    });

    it('jsonFormatter handles Error object in metadata', () => {
      const err = new Error('Database connection failed');
      const info = {
        timestamp: '2026-06-29T12:00:00.000Z',
        level: 'ERROR',
        message: 'Something went wrong',
        metadata: err
      };

      const result = jsonFormatter(info);
      const parsed = JSON.parse(result);

      assert.strictEqual(parsed.metadata.message, 'Database connection failed');
      assert.ok(parsed.metadata.stack.includes('Database connection failed'));
    });

    it('prettyFormatter formats logs into a readable string', () => {
      const info = {
        timestamp: '2026-06-29T12:00:00.000Z',
        level: 'WARN',
        message: 'Warning message',
        metadata: { code: 500 }
      };

      const result = prettyFormatter(info, { colorize: false });
      assert.ok(result.includes('2026-06-29T12:00:00.000Z [WARN]: Warning message'));
      assert.ok(result.includes("{ code: 500 }"));
    });

    it('prettyFormatter applies ANSI colors when colorize is true', () => {
      const info = {
        timestamp: '2026-06-29T12:00:00.000Z',
        level: 'ERROR',
        message: 'Error message'
      };

      const result = prettyFormatter(info, { colorize: true });
      // \x1b[31m is red color
      assert.ok(result.includes('\x1b[31m[ERROR]\x1b[0m'));
    });
  });

  describe('Logger level filtering', () => {
    let mockTransportCalls = [];
    const mockTransport = {
      level: undefined,
      log(info, defaultFormatter) {
        mockTransportCalls.push(info);
      }
    };

    beforeEach(() => {
      mockTransportCalls = [];
    });

    it('filters messages below configured level', () => {
      const logger = new Logger({
        level: 'WARN',
        transports: [mockTransport]
      });

      logger.debug('Debug message'); // Ignored
      logger.info('Info message');   // Ignored
      logger.warn('Warn message');   // Logged
      logger.error('Error message'); // Logged

      assert.strictEqual(mockTransportCalls.length, 2);
      assert.strictEqual(mockTransportCalls[0].level, 'WARN');
      assert.strictEqual(mockTransportCalls[1].level, 'ERROR');
    });

    it('updates minimum log level dynamically via setLevel()', () => {
      const logger = new Logger({
        level: 'ERROR',
        transports: [mockTransport]
      });

      logger.warn('Warn ignored');
      assert.strictEqual(mockTransportCalls.length, 0);

      logger.setLevel('WARN');
      logger.warn('Warn logged');
      assert.strictEqual(mockTransportCalls.length, 1);
      assert.strictEqual(mockTransportCalls[0].level, 'WARN');
    });

    it('throws error for invalid log level in setLevel', () => {
      const logger = new Logger();
      assert.throws(() => {
        logger.setLevel('INVALID');
      }, /Invalid log level/);
    });
  });

  describe('ConsoleTransport routing', () => {
    let stdoutData = [];
    let stderrData = [];
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    beforeEach(() => {
      stdoutData = [];
      stderrData = [];
      process.stdout.write = (chunk) => {
        stdoutData.push(chunk);
        return true;
      };
      process.stderr.write = (chunk) => {
        stderrData.push(chunk);
        return true;
      };
    });

    afterEach(() => {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    });

    it('routes INFO to stdout and ERROR to stderr by default', () => {
      const transport = new ConsoleTransport({
        formatter: (info) => `${info.level}: ${info.message}`
      });
      const logger = new Logger({
        level: 'DEBUG',
        transports: [transport]
      });

      logger.info('To stdout');
      logger.error('To stderr');

      assert.strictEqual(stdoutData.length, 1);
      assert.strictEqual(stdoutData[0], 'INFO: To stdout\n');

      assert.strictEqual(stderrData.length, 1);
      assert.strictEqual(stderrData[0], 'ERROR: To stderr\n');
    });

    it('respects custom transport-specific log levels', () => {
      const infoTransport = new ConsoleTransport({
        level: 'INFO',
        formatter: (info) => `${info.level}: ${info.message}`
      });
      const logger = new Logger({
        level: 'DEBUG',
        transports: [infoTransport]
      });

      logger.debug('Ignore debug at transport');
      logger.info('Log info at transport');

      assert.strictEqual(stdoutData.length, 1);
      assert.strictEqual(stdoutData[0], 'INFO: Log info at transport\n');
    });
  });

  describe('FileTransport', () => {
    const testDir = path.resolve('tests/temp_logs');
    const logFilePath = path.join(testDir, 'test.log');

    beforeEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('creates directory and appends logs to file', () => {
      const transport = new FileTransport({
        filename: logFilePath,
        formatter: (info) => `${info.level}: ${info.message}`
      });

      const logger = new Logger({
        transports: [transport]
      });

      logger.info('File write test 1');
      logger.info('File write test 2');

      assert.ok(fs.existsSync(logFilePath));
      const content = fs.readFileSync(logFilePath, 'utf8');
      assert.strictEqual(content, 'INFO: File write test 1\nINFO: File write test 2\n');
    });

    it('performs file rotation when maxSize is exceeded', () => {
      // 1 char = 1 byte. We set maxSize to 20 bytes.
      // Message length (10 chars + \n = 11 bytes)
      const transport = new FileTransport({
        filename: logFilePath,
        maxSize: 20,
        maxFiles: 2,
        formatter: (info) => `${info.message}` // simple formatter
      });

      const logger = new Logger({
        transports: [transport]
      });

      logger.info('123456789'); // 9 chars + 1 newline = 10 bytes -> writes to test.log (current size: 10)
      assert.ok(fs.existsSync(logFilePath));
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), '123456789\n');

      logger.info('ABCDEFGHI'); // 9 chars + 1 newline = 10 bytes -> total would be 20. Limit is 20, so 20 + 10 = 30 > 20 -> rotates before writing!
      // Rotating: test.log -> test.log.1, new test.log contains 'ABCDEFGHI\n'
      assert.ok(fs.existsSync(`${logFilePath}.1`));
      assert.strictEqual(fs.readFileSync(`${logFilePath}.1`, 'utf8'), '123456789\n');
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'ABCDEFGHI\n');

      logger.info('JKLMNOPQR'); // Rotates again: test.log.1 -> test.log.2, test.log -> test.log.1, test.log gets 'JKLMNOPQR\n'
      assert.ok(fs.existsSync(`${logFilePath}.2`));
      assert.strictEqual(fs.readFileSync(`${logFilePath}.2`, 'utf8'), '123456789\n');
      assert.strictEqual(fs.readFileSync(`${logFilePath}.1`, 'utf8'), 'ABCDEFGHI\n');
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'JKLMNOPQR\n');

      logger.info('STUVWXYZ1'); // Rotates again. Max files = 2, so test.log.2 (which has 123456789) is deleted!
      // test.log.1 -> test.log.2
      // test.log -> test.log.1
      // test.log gets 'STUVWXYZ1\n'
      assert.ok(!fs.existsSync(`${logFilePath}.3`));
      assert.strictEqual(fs.readFileSync(`${logFilePath}.2`, 'utf8'), 'ABCDEFGHI\n');
      assert.strictEqual(fs.readFileSync(`${logFilePath}.1`, 'utf8'), 'JKLMNOPQR\n');
      assert.strictEqual(fs.readFileSync(logFilePath, 'utf8'), 'STUVWXYZ1\n');
    });
  });
});
