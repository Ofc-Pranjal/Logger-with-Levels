import fs from 'node:fs';
import path from 'node:path';
import { Transport } from './Transport.js';

/**
 * File log transport with size-based rotation.
 */
export class FileTransport extends Transport {
  /**
   * @param {Object} options - File transport options.
   * @param {string} options.filename - Path to the log file.
   * @param {number} [options.maxSize] - Maximum file size in bytes before rotating.
   * @param {number} [options.maxFiles=5] - Maximum number of rotated files to keep.
   * @param {string} [options.level] - Custom minimum level for this transport.
   * @param {Function} [options.formatter] - Custom formatter for this transport.
   */
  constructor(options = {}) {
    super(options);
    if (!options.filename) {
      throw new Error('FileTransport requires a "filename" option');
    }
    this.filename = path.resolve(options.filename);
    this.maxSize = options.maxSize; // in bytes
    this.maxFiles = options.maxFiles ?? 5;

    // Ensure the output directory exists
    const dir = path.dirname(this.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Writes the message to the file, rotating first if necessary.
   * @param {string} message - Formatted log line.
   * @param {Object} info - Log info.
   */
  write(message, info) {
    const payload = message + '\n';

    if (this.maxSize) {
      this.checkAndRotate(payload.length);
    }

    fs.appendFileSync(this.filename, payload, 'utf8');
  }

  /**
   * Checks if writing the next chunk will exceed maxSize, and rotates if so.
   * @param {number} upcomingBytes - Size of the incoming log message in bytes.
   */
  checkAndRotate(upcomingBytes) {
    try {
      if (!fs.existsSync(this.filename)) return;

      const stats = fs.statSync(this.filename);
      // Rotate if the current size + new payload exceeds or equals maxSize
      if (stats.size + upcomingBytes >= this.maxSize) {
        this.rotate();
      }
    } catch (err) {
      // If we can't stat, log to stderr as fallback or ignore
      process.stderr.write(`FileTransport rotation stat check failed: ${err.message}\n`);
    }
  }

  /**
   * Rotates log files.
   * e.g., app.log -> app.log.1 -> app.log.2 -> app.log.3
   */
  rotate() {
    try {
      // 1. Delete the oldest log if it exceeds maxFiles
      const oldestFile = `${this.filename}.${this.maxFiles}`;
      if (fs.existsSync(oldestFile)) {
        fs.unlinkSync(oldestFile);
      }

      // 2. Shift all intermediate backup files
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const source = `${this.filename}.${i}`;
        const dest = `${this.filename}.${i + 1}`;
        if (fs.existsSync(source)) {
          fs.renameSync(source, dest);
        }
      }

      // 3. Rename current log to log.1
      fs.renameSync(this.filename, `${this.filename}.1`);
    } catch (err) {
      process.stderr.write(`FileTransport rotation failed: ${err.message}\n`);
    }
  }
}
