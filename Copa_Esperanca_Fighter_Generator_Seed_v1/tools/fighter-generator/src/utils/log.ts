import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logPath: string;

  constructor(baseDir: string) {
    this.logPath = path.join(baseDir, 'generator.log');
  }

  log(entry: {
    participantId: string;
    job: string;
    frame: string;
    provider: string;
    model: string;
    attempt: number;
    durationMs: number;
    outputPath?: string;
    sha256?: string;
    result: string;
    error?: string;
  }) {
    const timestamp = new Date().toISOString();
    const logLine = JSON.stringify({ timestamp, ...entry }) + '\n';
    fs.appendFileSync(this.logPath, logLine);
  }
}
