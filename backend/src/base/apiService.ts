import { ApiContext } from './apiContext';

export class ApiService {
  readonly context: ApiContext;
  readonly log: ApiContext['logger'];

  constructor(context: ApiContext) {
    if (!(context instanceof ApiContext)) {
      throw new Error('The context argument needs to be an instance of ApiContext');
    }

    this.context = context;
    this.log = context.logger;
  }
}
