// - Tenta fazer a requisição até 4 vezes
// - A cada falha, espera um tempo exponencial (2^n * base), ou seja, 100ms, 200ms, 400ms, etc.
// - Se falhar com erro 4xx, não tenta mais
// - Se falhar com erro 5xx ou de rede, tenta novamente
// - Se falhar após 4 tentativas, lança o erro final
// - Se tiver idempotencyKey, salva o resultado no Redis para evitar duplicação
// Tentei seguir um padrao de backoff que é comum em sistemas distribuídos

export function backoff(attempt: number, base = 100) {
  const delay = Math.pow(2, attempt) * base;
  const jitter = Math.random() * base; // evita thundering herd - ocorre quando um grande número de processos ou threads simultaneamente tenta acessar o mesmo recurso, levando a um pico de atividade e potencialmente causando gargalos de desempenho no sistema
  return Math.min(delay + jitter, 10000);
}
