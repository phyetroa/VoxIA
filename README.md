# Voxia — site inicial

Protótipo estático em HTML, CSS e JavaScript. Pode ser publicado diretamente no GitHub Pages.

## Abrir localmente

Abra `index.html` no navegador. Para testar de modo mais próximo da publicação, use a extensão Live Server no VS Code.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie a pasta `voxia-site`.
2. Em **Settings > Pages**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/ (root)`.
4. Salve e aguarde o endereço público do GitHub Pages.

## Conectar ao Supabase

1. Crie um projeto no Supabase.
2. No **SQL Editor**, execute o conteúdo de `supabase-schema.sql` para cadastrar as fontes iniciais.
3. Crie as tabelas de perfis, propostas, apoios, comentários e moderação antes de trocar os dados demonstrativos de `app.js` por dados reais.
4. Adicione a URL do GitHub Pages em **Authentication > URL Configuration** ao configurar login.

O protótipo atual não contém chaves, autenticação, banco conectado ou publicação configurada.
