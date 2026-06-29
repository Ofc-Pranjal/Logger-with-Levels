import util from 'node:util';

const COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m'
};

/**
 * Formats log info as a JSON string.
 * @param {Object} info - Log information object.
 * @param {string} info.timestamp - ISO timestamp.
 * @param {string} info.level - Log level (DEBUG, INFO, etc.).
 * @param {string} info.message - Log message.
 * @param {Object} [info.metadata] - Optional metadata.
 * @returns {string} JSON log line.
 */
export function jsonFormatter({ timestamp, level, message, metadata }) {
  const logObj = { timestamp, level, message };
  if (metadata !== undefined && metadata !== null) {
    // If metadata is an Error, serialize its message and stack
    if (metadata instanceof Error) {
      logObj.metadata = {
        message: metadata.message,
        stack: metadata.stack,
        ...metadata
      };
    } else {
      logObj.metadata = metadata;
    }
  }
  return JSON.stringify(logObj);
}

/**
 * Formats log info as a human-readable pretty string.
 * @param {Object} info - Log information object.
 * @param {string} info.timestamp - ISO timestamp.
 * @param {string} info.level - Log level (DEBUG, INFO, etc.).
 * @param {string} info.message - Log message.
 * @param {Object} [info.metadata] - Optional metadata.
 * @param {Object} [options] - Formatter options.
 * @param {boolean} [options.colorize=false] - Whether to apply ANSI colors.
 * @returns {string} Formatted log line.
 */
export function prettyFormatter({ timestamp, level, message, metadata }, options = {}) {
  const colorize = options.colorize ?? false;
  
  let levelStr = `[${level}]`;
  if (colorize) {
    const color = COLORS[level.toUpperCase()] || COLORS.RESET;
    levelStr = `${color}[${level}]${COLORS.RESET}`;
  }

  let metaStr = '';
  if (metadata !== undefined && metadata !== null) {
    if (metadata instanceof Error) {
      metaStr = `\n${metadata.stack || metadata.message}`;
    } else if (typeof metadata === 'object') {
      if (Object.keys(metadata).length > 0) {
        metaStr = ` ${util.inspect(metadata, { colors: colorize, depth: null, breakLength: Infinity })}`;
      }
    } else {
      metaStr = ` ${metadata}`;
    }
  }

  return `${timestamp} ${levelStr}: ${message}${metaStr}`;
}
