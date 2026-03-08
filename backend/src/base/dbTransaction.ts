import crypto from 'crypto';
import { ApiContext } from './apiContext';

type TransactionConnection = {
  beginTransaction: (requestId: string) => Promise<void>;
  rollbackTransaction: (requestId: string) => Promise<void>;
  commitTransaction: (requestId: string) => Promise<void>;
  transactionReqId?: string;
};

export class DbTransaction {
  private readonly connection?: TransactionConnection;
  private readonly requestId: string;
  private readonly log: ApiContext['logger'];

  constructor(context: ApiContext) {
    if (!(context instanceof ApiContext)) {
      throw new Error('The context argument needs to be an instance of ApiContext');
    }

    this.connection = context.connection as TransactionConnection | undefined;
    this.requestId = crypto.randomUUID();
    this.log = context.logger;
  }

  async runWithinTransaction<T>(serviceFn: () => Promise<T>): Promise<T> {
    if (!this.connection) {
      throw new Error('Invalid context to start a transaction.');
    }

    this.connection.transactionReqId = this.requestId;

    await this.startTransaction(this.requestId);
    try {
      const result = await serviceFn();
      await this.commitTransaction(this.requestId);
      return result;
    } catch (error) {
      await this.rollbackTransaction(this.requestId);
      throw error;
    }
  }

  private async startTransaction(requestId: string): Promise<void> {
    await this.connection?.beginTransaction(requestId);
  }

  private async rollbackTransaction(requestId: string): Promise<void> {
    try {
      await this.connection?.rollbackTransaction(requestId);
    } catch (error) {
      this.log.error('dbTransaction.rollback.error', { requestId, error });
    }
  }

  private async commitTransaction(requestId: string): Promise<void> {
    await this.connection?.commitTransaction(requestId);
  }
}
