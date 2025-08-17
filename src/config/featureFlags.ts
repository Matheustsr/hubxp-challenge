import { logger } from '../logs/logger';

interface FeatureFlags {
  FF_CIRCUIT_BREAKER: boolean;
  FF_CACHE_TOKEN: boolean;
  FF_RATE_LIMITING: boolean;
  FF_METRICS: boolean;
}

class FeatureFlagService {
  private flags: FeatureFlags;

  constructor() {
    this.flags = {
      FF_CIRCUIT_BREAKER: this.parseBooleanEnv('FF_CIRCUIT_BREAKER', true),
      FF_CACHE_TOKEN: this.parseBooleanEnv('FF_CACHE_TOKEN', true),
      FF_RATE_LIMITING: this.parseBooleanEnv('FF_RATE_LIMITING', true),
      FF_METRICS: this.parseBooleanEnv('FF_METRICS', true),
    };

    logger.info({ event: 'feature_flags_loaded', flags: this.flags });
  }

  private parseBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  // Método para atualizar flags em runtime (útil para testes)
  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
    logger.info({ event: 'feature_flag_updated', flag, value });
  }
}

export const featureFlags = new FeatureFlagService();
export type { FeatureFlags };
