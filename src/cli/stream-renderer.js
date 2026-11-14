'use strict';

class StreamRenderer {
  constructor(options = {}) {
    this.linePrefix = options.linePrefix || '';
    this.quiet = Boolean(options.quiet);
    this.isStreaming = false;
    this.atLineStart = true;
  }

  start() {
    if (this.quiet) return;
    this.isStreaming = true;
    this.atLineStart = true;
    if (this.linePrefix) {
      process.stdout.write(this.linePrefix);
    }
  }

  onToken(token) {
    if (this.quiet || !this.isStreaming) return;
    if (!token) return;

    // Handle newlines: add prefix after each newline
    const parts = token.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        process.stdout.write('\n');
        if (this.linePrefix) {
          process.stdout.write(this.linePrefix);
        }
      }
      if (parts[i]) {
        process.stdout.write(parts[i]);
        this.atLineStart = false;
      }
    }
  }

  end() {
    if (this.quiet || !this.isStreaming) return;
    this.isStreaming = false;
    process.stdout.write('\n');
  }
}

module.exports = StreamRenderer;
