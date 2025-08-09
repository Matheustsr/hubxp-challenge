'use strict';

exports.config = {
  app_name: ['hubxp-challenge'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || 'SUA_CHAVE_DE_LICENCA',
  logging: {
    level: 'info', // níveis: trace, debug, info, warn, error, fatal
  },
  distributed_tracing: {
    enabled: true
  }
};
