import { LEVEL_PRIORITIES } from '../Logger.js';

/**
 * Base Transport class that all log transports must extend.
 */
export class Transport {
  /**
   * @param {Object} [options] - Transport options.
   * @param {string} [options.level] - Transport-specific minimum log level.
   * @param {Function} [options.formatter] - Transport-specific formatter function.
   */
  constructor(options = {}) {
    this.level = options.level;
    this.formatter = options.formatter;
  }

  /**
   * Checks if a level is enabled for this transport.
   * @param {string} logLevel - The level to check.
   * @returns {boolean}
   */
  isLevelEnabled(logLevel) {
    if (!this.level) return true;
    
    const minPriority = LEVEL_PRIORITIES[this.level.toUpperCase()] ?? 0;
    const currentPriority = LEVEL_PRIORITIES[logLevel.toUpperCase()] ?? 0;
    
    return currentPriority >= minPriority;
  }

  /**
   * Formats and logs the info.
   * @param {Object} info - Log information.
   * @param {Function} defaultFormatter - The default formatter to fall back to.
   */
  log(info, defaultFormatter) {
    if (!this.isLevelEnabled(info.level)) {
      return;
    }

    const formatter = this.formatter || defaultFormatter;
    const formattedMessage = formatter(info);
    
    this.write(formattedMessage, info);
  }

  /**
   * Writes the formatted message. Must be overridden by subclasses.
   * @param {string} message - Formatted message string.
   * @param {Object} info - Original log info object.
   */
  write(message, info) {
    throw new Error('Transport subclasses must implement the write method');
  }

  /**
   * Optional cleanup/close method for transport teardown.
   */
  close() {}
}
