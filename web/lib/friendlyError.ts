/** Traduz erros crus dos providers em mensagens que um utilizador consegue perceber e agir. */
export function friendlyUpstreamError(status: number, payload: unknown): string | null {
  const raw = JSON.stringify(payload).toLowerCase();

  if (status === 401 || status === 403 || raw.includes("invalid_api_key") || raw.includes("api key not valid")) {
    return "A tua chave de API foi rejeitada pelo provider. Confirma que a copiaste corretamente em /settings, ou gera uma nova.";
  }
  if (status === 429 || raw.includes("quota") || raw.includes("resource_exhausted")) {
    return "O provider recusou o pedido por limite de quota/rate atingido do lado deles. Espera um pouco ou verifica o teu plano na consola do provider.";
  }
  if (status === 404 && raw.includes("model")) {
    return "O modelo pedido não existe ou já não está disponível. Confirma o nome do modelo na consola do provider.";
  }
  if (status >= 500) {
    return "O provider teve um erro interno. Tenta outra vez daqui a pouco.";
  }
  return null;
}
