import { ConsoleTransport } from './transports/ConsoleTransport.js';
import { prettyFormatter, jsonFormatter } from './Formatters.js';

export const LEVEL_PRIORITIES = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * Core Logger class.
 */
export class Logger {
  /**
   * @param {Object} [options] - Logger options.
   * @param {string} [options.level='INFO'] - Default minimum log level.
   * @param {string|Function} [options.format='pretty'] - Global formatter ('pretty', 'json', or custom function).
   * @param {Transport[]} [options.transports] - List of log transports.
   */
  constructor(options = {}) {
    this.setLevel(options.level || 'INFO');

    // Configure global formatter
    const formatOption = options.format || 'pretty';
    if (typeof formatOption === 'function') {
      this.formatter = formatOption;
    } else if (formatOption === 'json') {
      this.formatter = jsonFormatter;
    } else {
      this.formatter = (info) => prettyFormatter(info, { colorize: false });
    }

    // Configure default transport if none provided
    if (options.transports && options.transports.length > 0) {
      this.transports = options.transports;
    } else {
      // By default, ConsoleTransport uses prettyFormatter with colorize: true
      this.transports = [
        new ConsoleTransport({
          formatter: (info) => prettyFormatter(info, { colorize: true })
        })
      ];
    }
  }

  /**
   * Sets the minimum active log level.
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR).
   */
  setLevel(level) {
    const lvl = level.toUpperCase();
    if (LEVEL_PRIORITIES[lvl] === undefined) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.level = lvl;
  }

  /**
   * Logs a message at a specified level.
   * @param {string} level - Log level.
   * @param {string} message - Message to log.
   * @param {*} [metadata] - Extra metadata object or error.
   */
  log(level, message, metadata) {
    const lvl = level.toUpperCase();
    const currentPriority = LEVEL_PRIORITIES[lvl] ?? 0;
    const minPriority = LEVEL_PRIORITIES[this.level] ?? 0;

    if (currentPriority < minPriority) {
      return;
    }

    const timestamp = new Date().toISOString();
    const info = {
      timestamp,
      level: lvl,
      message,
      metadata
    };

    for (const transport of this.transports) {
      try {
        transport.log(info, this.formatter);
      } catch (err) {
        process.stderr.write(`Failed to log to transport: ${err.message}\n`);
      }
    }
  }

  /**
   * Log at DEBUG level.
   */
  debug(message, metadata) {
    this.log('DEBUG', message, metadata);
  }

  /**
   * Log at INFO level.
   */
  info(message, metadata) {
    this.log('INFO', message, metadata);
  }

  /**
   * Log at WARN level.
   */
  warn(message, metadata) {
    this.log('WARN', message, metadata);
  }

  /**
   * Log at ERROR level.
   */
  error(message, metadata) {
    this.log('ERROR', message, metadata);
  }

  /**
   * Helper to close all transports if necessary.
   */
  close() {
    for (const transport of this.transports) {
      if (typeof transport.close === 'function') {
        transport.close();
      }
    }
  }
}
