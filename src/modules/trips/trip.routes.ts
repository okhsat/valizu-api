import { Router } from 'express';
import { getRouteParam } from '../../lib/route.params.js';
import { requireUser, type AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.handler.js';
import { listTrips, copyTrip } from './trip.service.js';

export const tripRouter = Router();

tripRouter.get(
  '/trips',
  requireUser,
  async (req, res, next) => {
    try {
      const trips = await listTrips(
        (req as AuthenticatedRequest).userId,
      );

      res.json({
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  },
);

tripRouter.post(
  '/trips/:tripId/copy',
  requireUser,
  async (req, res, next) => {
    try {
      const tripId = getRouteParam(
        req.params.tripId,
        'tripId',
      );

      const rawIdempotencyKey = req.header('Idempotency-Key');
      const idempotencyKey = rawIdempotencyKey?.trim();

      if (
        ! idempotencyKey ||
        idempotencyKey.length > 255
      ) {
        throw new AppError(
          400,
          'INVALID_IDEMPOTENCY_KEY',
          'Idempotency-Key must be between 1 and 255 characters',
        );
      }

      const result = await copyTrip(
        (req as AuthenticatedRequest).userId,
        tripId,
        idempotencyKey,
      );

      res.status(201).json({
        data: result,
      });

    } catch (error) {
      next(error);
    }
  },
);
