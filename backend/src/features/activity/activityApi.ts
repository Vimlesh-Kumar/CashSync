import { Router } from 'express';
import { activityController } from './activityController';

const router = Router();

router.get('/user/:userId', activityController.getForUser);
router.get('/group/:groupId', activityController.getForGroup);

export default router;
