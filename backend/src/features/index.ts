import { Application } from 'express';
import { appLogger } from '../base/log';
import budgetRouter from './budget/budgetApi';
import categoryRouter from './category/categoryApi';
import groupRouter from './group/groupApi';
import transactionRouter from './transaction/transactionApi';
import userRouter from './user/userApi';

interface Feature {
  basePath: string;
  router: ReturnType<typeof import('express').Router>;
}

const features: Feature[] = [
  { basePath: '/api/users', router: userRouter },
  { basePath: '/api/categories', router: categoryRouter },
  { basePath: '/api/budgets', router: budgetRouter },
  { basePath: '/api/groups', router: groupRouter },
  { basePath: '/api/transactions', router: transactionRouter },
];

export function registerAllFeatures(app: Application): void {
  for (const feature of features) {
    app.use(feature.basePath, feature.router);
  }

  appLogger.info('feature.registered', {
    count: features.length,
    basePaths: features.map((feature) => feature.basePath),
  });
}
