import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import v1 from './routes/v1/index.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';

// Orígenes permitidos separados por coma (producción y vistas previas). Sin comodín (Spec 7).
const origenes = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: origenes, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Pendiente en las ramas de las Specs 7 y 8: logger pino, rate limit con Redis,
// cookie-parser y rutas /auth.

app.use('/api/v1', v1);
app.use(notFound);
app.use(errorHandler);

export default app;
