import { Router } from 'express';
import { listUsers } from './user.service.js';

export const userRouter = Router();

userRouter.get(
  '/users',
  async (req, res, next) => {
    try {
      const users = await listUsers();

      res.json({
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },
);
