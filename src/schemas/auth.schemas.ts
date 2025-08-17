import { z } from 'zod';

// Schema para credenciais do Google
export const GoogleCredentialsSchema = z.object({
  token: z
    .string()
    .min(1, 'Token do Google é obrigatório')
    .describe('Token de autenticação do Google'),
});

// Schema para credenciais do Azure
export const AzureCredentialsSchema = z.object({
  username: z
    .string()
    .min(1, 'Username é obrigatório')
    .describe('Nome de usuário do Azure'),
  password: z
    .string()
    .min(1, 'Password é obrigatório')
    .describe('Senha do Azure'),
});

// Schema base para login
export const LoginRequestSchema = z
  .object({
    provider: z.enum(['google', 'azure'], {
      message: 'Provider deve ser "google" ou "azure"',
    }),
    credentials: z.union([GoogleCredentialsSchema, AzureCredentialsSchema]),
  })
  .refine(
    data => {
      // Validação específica baseada no provider
      if (data.provider === 'google') {
        return GoogleCredentialsSchema.safeParse(data.credentials).success;
      }
      if (data.provider === 'azure') {
        return AzureCredentialsSchema.safeParse(data.credentials).success;
      }
      return false;
    },
    {
      message: 'Credentials não correspondem ao provider selecionado',
      path: ['credentials'],
    }
  );

// Tipos derivados dos schemas
export type GoogleCredentials = z.infer<typeof GoogleCredentialsSchema>;
export type AzureCredentials = z.infer<typeof AzureCredentialsSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Schema mais específico para validação de provider e credentials
export const GoogleLoginSchema = z.object({
  provider: z.literal('google'),
  credentials: GoogleCredentialsSchema,
});

export const AzureLoginSchema = z.object({
  provider: z.literal('azure'),
  credentials: AzureCredentialsSchema,
});

export type GoogleLogin = z.infer<typeof GoogleLoginSchema>;
export type AzureLogin = z.infer<typeof AzureLoginSchema>;
