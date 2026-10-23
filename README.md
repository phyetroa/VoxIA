# Voxia

Site responsivo da plataforma de participação cidadã Voxia. O frontend é exportado como conteúdo estático para o GitHub Pages; autenticação e dados usam Supabase.

## Desenvolvimento local

1. Instale as dependências com `npm ci`.
2. Copie `.env.local.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e a chave publicável do projeto Voxia.
3. Inicie o site com `npm run dev`.

Nunca coloque uma chave `service_role` ou uma chave secreta em variáveis `NEXT_PUBLIC_*`.

## Banco de dados

O esquema do Supabase está em `supabase/schema.sql`. Ele cria perfis, categorias, propostas, apoios, comentários, catálogo de fontes, referências jurídicas, RLS e funções seguras para publicação e interações. Propostas enviadas pelo formulário são publicadas imediatamente.

Para atualizar um banco existente, execute uma vez as migrações de `supabase/migrations/` no SQL Editor do Supabase, na ordem dos nomes. Apoios são limitados pelo par proposta/usuário no banco; comentários só podem ser enviados em propostas aprovadas.

A migração `20261023_public_tracking_and_notifications.sql` adiciona edição segura de propostas publicadas, linha do tempo moderada com evidências HTTPS, notificações privadas, desafios cívicos semanais e métricas públicas agregadas. Ela pressupõe que o esquema-base e as migrações anteriores já foram aplicados. A interface dessas funções depende dessa migração; depois de executá-la, recarregue o site.

Referências jurídicas aparecem como verificadas somente após conferência em fonte oficial. As cinco fontes iniciais estão cadastradas para revisão.

## Autenticação

O acesso usa e-mail e senha pelo Supabase Auth. Quem já tem senha entra diretamente sem receber um link. Contas antigas criadas por link podem usar “Esqueci minha senha” uma vez para definir a senha; novos cadastros podem exigir confirmação de e-mail conforme as configurações do Supabase.

O avatar é exibido quando o provedor de autenticação fornece `picture` ou `avatar_url`; o login por link de e-mail não fornece automaticamente a foto de perfil do Google. Sem essa informação, a Voxia mostra iniciais do usuário.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` compila e publica o site no GitHub Pages a cada envio para `main`. As variáveis públicas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` ficam nas variáveis do repositório em **Settings > Secrets and variables > Actions > Variables**.
