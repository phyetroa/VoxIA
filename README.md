# Voxia

Site responsivo da plataforma de participação cidadã Voxia. O frontend é exportado como conteúdo estático para o GitHub Pages; autenticação e dados usam Supabase.

## Desenvolvimento local

1. Instale as dependências com `npm ci`.
2. Copie `.env.local.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e a chave publicável do projeto Voxia.
3. Inicie o site com `npm run dev`.

Nunca coloque uma chave `service_role` ou uma chave secreta em variáveis `NEXT_PUBLIC_*`.

## Banco de dados

O esquema do Supabase está em `supabase/schema.sql`. Ele cria perfis, categorias, propostas, apoios, comentários, catálogo de fontes, referências jurídicas, RLS e funções seguras para estatísticas e leitura dos comentários públicos. O esquema inicial já foi aplicado ao projeto Voxia.

Para atualizar um banco existente, execute uma única vez `supabase/migrations/20261022_proposal_interactions.sql` no SQL Editor do Supabase. Apoios são limitados pelo par proposta/usuário no banco; comentários só podem ser enviados em propostas aprovadas.

Referências jurídicas aparecem como verificadas somente após conferência em fonte oficial. As cinco fontes iniciais estão cadastradas para revisão.

## Autenticação

O site envia um link de acesso por e-mail pelo Supabase Auth. A URL principal e o retorno publicado estão configurados para `https://phyetroa.github.io/VoxIA`.

O avatar é exibido quando o provedor de autenticação fornece `picture` ou `avatar_url`; o login por link de e-mail não fornece automaticamente a foto de perfil do Google. Sem essa informação, a Voxia mostra iniciais do usuário.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` compila e publica o site no GitHub Pages a cada envio para `main`. As variáveis públicas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` ficam nas variáveis do repositório em **Settings > Secrets and variables > Actions > Variables**.
