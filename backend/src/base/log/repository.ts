export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface LogRepository {
  save(entry: LogEntry): void;
}

export class ConsoleLogRepository implements LogRepository {
  save(entry: LogEntry): void {
    const line = JSON.stringify(entry);

    if (entry.level === 'ERROR') {
      console.error(line);
      return;
    }

    if (entry.level === 'WARN') {
      console.warn(line);
      return;
    }

    console.log(line);
  }
}
