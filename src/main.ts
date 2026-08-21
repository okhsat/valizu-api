import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { bagRouter } from './modules/bags/bag.routes.js';
import { itemRouter } from './modules/items/item.routes.js';
import { tripRouter } from './modules/trips/trip.routes.js';
import { errorHandler } from './middleware/error.handler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.use(bagRouter);
app.use(itemRouter);
app.use(tripRouter);

app.use(errorHandler);

const port = Number(process.env.API_PORT ?? 3000);

app.listen(port, () => {
  console.log(`Valizu API listening on port ${port}`);
});
