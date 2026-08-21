import { AppError } from '../middleware/error.handler.js';

export function getRouteParam(
  value: string | string[] | undefined,
  name: string,

): string {
  if ( typeof value !== 'string' || ! value ) {
    throw new AppError(
      400,
      'INVALID_ROUTE_PARAM',
      `${name} is required`,
    );
  }

  return value;
}
