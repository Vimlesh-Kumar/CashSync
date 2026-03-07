import { Application } from 'express';
import transactionRouter from './transaction/transactionApi';
import userRouter from './user/userApi';

// ─── Feature Registry ─────────────────────────────────────────────────────────
// One place to register ALL feature routes.
// Each feature owns its base path here.
// server.ts just calls registerAllFeatures(app) — nothing else.

interface Feature {
    basePath: string;
    router: ReturnType<typeof import('express').Router>;
}

const features: Feature[] = [
    { basePath: '/api/users', router: userRouter },
    { basePath: '/api/transactions', router: transactionRouter },
];

export function registerAllFeatures(app: Application): void {
    for (const feature of features) {
        app.use(feature.basePath, feature.router);
    }
    console.log(`✅ Registered ${features.length} feature(s):`, features.map(f => f.basePath).join(', '));
}
