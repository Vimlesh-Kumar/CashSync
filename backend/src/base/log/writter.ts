import { LogEntry, LogRepository } from './repository';

export class LogWritter {
  constructor(private readonly repository: LogRepository) {}

  write(entry: LogEntry): void {
    this.repository.save(entry);
  }
}
