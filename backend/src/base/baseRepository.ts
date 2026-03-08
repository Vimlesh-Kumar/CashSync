import { ApiContext } from './apiContext';

export class BaseRepository {
  readonly context: ApiContext;
  readonly connection?: unknown;
  readonly tenantConnection?: unknown;
  readonly log: ApiContext['logger'];

  constructor(context: ApiContext) {
    if (!(context instanceof ApiContext)) {
      throw new Error('The context argument needs to be an instance of ApiContext');
    }

    this.context = context;
    this.connection = context.connection;
    this.tenantConnection = context.getTenantConnection();
    this.log = context.logger;
  }
}
