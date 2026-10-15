import { Hono } from 'hono';
import type { AppEnv } from './env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestId } from './middleware/request-id';
import { admin } from './routes/admin';
import { assistant } from './routes/assistant';
import { health } from './routes/health';
import { storage } from './routes/storage';

const app = new Hono<AppEnv>();

app.use('*', requestId);
app.use('*', corsMiddleware);
app.onError(errorHandler);
app.notFound(notFoundHandler);

const v1 = new Hono<AppEnv>();
v1.route('/', health);
v1.route('/', storage);
v1.route('/', assistant);
v1.route('/admin', admin);
app.route('/api/v1', v1);

export default app;
