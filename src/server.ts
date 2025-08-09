import app from './app';
import config from './config';
import { logger } from './logs/logger';

app.listen(config.port, () => {
  logger.info({ event: 'server_started', port: config.port });
});
