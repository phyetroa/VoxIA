# Voxia

Site responsivo da plataforma de participação cidadã Voxia. O frontend é exportado como conteúdo estático para o GitHub Pages; autenticação e dados usam Supabase.

## Desenvolvimento local

1. Instale as dependências com `npm ci`.
2. Copie `.env.local.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e a chave publicável do projeto Voxia.
3. Inicie o site com `npm run dev`.

Nunca coloque uma chave `service_role` ou uma chave secreta em variáveis `NEXT_PUBLIC_*`.

## Banco de dados

O esquema do Supabase está em `supabase/schema.sql`. Ele cria perfis, categorias, propostas, apoios, catálogo de fontes, referências jurídicas, RLS e a função de moderação. O esquema inicial já foi aplicado ao projeto Voxia.

Referências jurídicas aparecem como verificadas somente após conferência em fonte oficial. As cinco fontes iniciais estão cadastradas para revisão.

## Autenticação

O site envia um link de acesso por e-mail pelo Supabase Auth. A URL principal e o retorno publicado estão configurados para `https://phyetroa.github.io/VoxIA`.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` compila e publica o site no GitHub Pages a cada envio para `main`. As variáveis públicas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` ficam nas variáveis do repositório em **Settings > Secrets and variables > Actions > Variables**.
