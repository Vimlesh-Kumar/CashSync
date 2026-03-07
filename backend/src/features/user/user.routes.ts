import { Router } from 'express';
import { getUserProfile, syncUserIdentity } from './user.controller';

const router = Router();

// Route for OAuth Identity linking
router.post('/sync', syncUserIdentity);

// Route for getting the standard user profile
router.get('/:id', getUserProfile);

export default router;
