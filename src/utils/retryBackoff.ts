
export function backoff(attempt: number, base = 100) {
  const exp = Math.pow(2, attempt) * base;
  const jitter = Math.random() * base;
  return Math.min(exp + jitter, 10000); 
}
