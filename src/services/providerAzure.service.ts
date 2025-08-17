export async function validateAzureCredentials(username: string, password: string) {
  await new Promise(r => setTimeout(r, 50)); // latencia do servidor
  if (username === 'john.doe' && password === 'Test@123') {
    return { id: 'azure-john', username, role: 'user', provider: 'azure' };
  }
  if (username === 'admin' && password === 'Admin@123') {
    return { id: 'azure-admin', username, role: 'admin', provider: 'azure' };
  }
  throw new Error('Invalid username/password');
}
