import { Transport } from './Transport.js';

/**
 * Console log transport.
 */
export class ConsoleTransport extends Transport {
  /**
   * @param {Object} [options] - Console transport options.
   * @param {string[]} [options.stderrLevels=['ERROR']] - Levels that should write to stderr instead of stdout.
   * @param {string} [options.level] - Custom minimum level for this transport.
   * @param {Function} [options.formatter] - Custom formatter for this transport.
   */
  constructor(options = {}) {
    super(options);
    this.stderrLevels = (options.stderrLevels || ['ERROR']).map(l => l.toUpperCase());
  }

  /**
   * Writes the message to the appropriate console stream.
   * @param {string} message - Formatted log line.
   * @param {Object} info - Log info containing level.
   */
  write(message, info) {
    const payload = message + '\n';
    if (this.stderrLevels.includes(info.level.toUpperCase())) {
      process.stderr.write(payload);
    } else {
      process.stdout.write(payload);
    }
  }
}
