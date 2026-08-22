import { Router } from 'express';
import { getRouteParam } from '../../lib/route.params.js';
import { requireUser, type AuthenticatedRequest } from '../../middleware/auth.js';
import { createBagSchema, updateBagSchema } from './bag.schemas.js';
import { listBags, createBag, updateBag } from './bag.service.js';

export const bagRouter = Router();

bagRouter.get(
  '/trips/:tripId/bags',
  requireUser,
  async (req, res, next) => {
    try {
      const tripId = getRouteParam(
        req.params.tripId,
        'tripId',
      );

      const bags = await listBags(
        (req as AuthenticatedRequest).userId,
        tripId,
      );

      res.json({
        data: bags,
      });
    } catch (error) {
      next(error);
    }
  },
);

bagRouter.post(
  '/trips/:tripId/bags',
  requireUser,
  async (req, res, next) => {
    try {
      const tripId = getRouteParam(req.params.tripId, 'tripId');
      const { name } = createBagSchema.parse(req.body);

      const bag = await createBag(
        (req as AuthenticatedRequest).userId,
        tripId,
        name,
      );

      res.status(201).json({
        data: bag,
      });

    } catch (error) {
      next(error);
    }
  },
);

bagRouter.patch(
  '/bags/:bagId',
  requireUser,
  async (req, res, next) => {
    try {
      const bagId = getRouteParam(req.params.bagId, 'bagId');
      const { name } = updateBagSchema.parse(req.body);

      const bag = await updateBag(
        (req as AuthenticatedRequest).userId,
        bagId,
        name,
      );

      res.json({
        data: bag,
      });

    } catch (error) {
      next(error);
    }
  },
);
