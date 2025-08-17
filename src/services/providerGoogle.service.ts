export async function validateGoogleToken(token: string) {
  // dados de teste do enunciado
  if (token === 'google_valid_token_123') {
    return {
      id: 'google-123',
      email: 'user@googlemock.com',
      name: 'Google Mock User',
      provider: 'google',
    };
  }

  // latencia
  await new Promise(r => setTimeout(r, 50));
  throw new Error('Invalid Google token');
}
