// Mock do Redis para testes
class MockRedis {
  private data = new Map<
    string,
    { value: string; ttl?: number; expireAt?: number }
  >();

  async get(key: string): Promise<string | null> {
    const item = this.data.get(key);
    if (!item) return null;

    // Verificar se expirou
    if (item.expireAt && Date.now() > item.expireAt) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<'OK'> {
    const item: { value: string; ttl?: number; expireAt?: number } = { value };

    if (mode === 'EX' && duration) {
      item.ttl = duration;
      item.expireAt = Date.now() + duration * 1000;
    }

    this.data.set(key, item);
    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const keys = Array.from(this.data.keys());
    if (pattern === '*') return keys;

    // Converter padrão glob para regex simples
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async ttl(key: string): Promise<number> {
    const item = this.data.get(key);
    if (!item) return -2; // Key doesn't exist
    if (!item.expireAt) return -1; // No expiration

    const remainingMs = item.expireAt - Date.now();
    return Math.ceil(remainingMs / 1000);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.data.get(key);
    if (!item) return 0;

    item.expireAt = Date.now() + seconds * 1000;
    return 1;
  }

  async quit(): Promise<'OK'> {
    this.data.clear();
    return 'OK';
  }

  get status(): string {
    return 'ready';
  }
}

export { MockRedis };
