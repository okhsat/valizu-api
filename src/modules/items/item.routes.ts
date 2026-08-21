import { Router } from 'express';
import { getRouteParam } from '../../lib/route.params.js';
import { requireUser, type AuthenticatedRequest } from '../../middleware/auth.js';
import { addItemSchema } from './item.schemas.js';
import {
  addItemToBag,
  removeItemFromBag,
} from './item.service.js';

export const itemRouter = Router();

itemRouter.post(
  '/bags/:bagId/items',
  requireUser,
  async (req, res, next) => {
    try {
      const bagId = getRouteParam(req.params.bagId, 'bagId');
      const { itemId, quantity } = addItemSchema.parse(req.body);

      const result = await addItemToBag(
        (req as AuthenticatedRequest).userId,
        bagId,
        itemId,
        quantity,
      );

      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

itemRouter.delete(
  '/bags/:bagId/items/:itemId',
  requireUser,
  async (req, res, next) => {
    try {
      const bagId = getRouteParam(req.params.bagId, 'bagId');
      const itemId = getRouteParam(req.params.itemId, 'itemId');

      await removeItemFromBag(
        (req as AuthenticatedRequest).userId,
        bagId,
        itemId,
      );

      res.status(204).send();

    } catch (error) {
      next(error);
    }
  },
);
