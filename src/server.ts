import app from './app';
import { env } from './config/env';
import { ensureSchema } from './db/schema';

const start = async (): Promise<void> => {
  await ensureSchema();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Postgres database "${env.DB_NAME}" is ready`);
  });
};

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
