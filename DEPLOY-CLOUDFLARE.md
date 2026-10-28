# Deploy na Cloudflare Pages (migração da Vercel)

> Guia curto para publicar o site na Cloudflare conectando o repositório do GitHub.
> Equivalências do `vercel.json` já estão no repo: `_redirects` (rewrite `/br`) e `_headers` (headers de segurança/cache/noindex).

## 1. Conectar o GitHub

1. Abra o painel: <https://dash.cloudflare.com/?to=/:account/workers-and-pages>
2. **Create application** → aba **Pages** → **Connect to Git**.
3. Escolha **GitHub** → autentique (pode ser *Only select repositories* → `jotta19992026-coder/oficial-leilao`).
4. Clique em **Install & Authorize** → **Begin setup**.
5. Configure (**Set up builds and deployments**):

   | Campo | Valor |
   |---|---|
   | Project name | `oficial-leilao` (vira `<nome>.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | nenhum (site estático, sem build) |
   | Build command | `node scripts/build-pages.js` |
   | Build output directory | `dist` |
   | Root directory | vazio (raiz) |

   > O build monta `dist/` só com o site (HTML, `css/`, `js/`, `images/`, ícones e os arquivos `_redirects`/`_headers`) e **deixa de fora** `scripts/`, `supabase/*.sql`, `*.md`, `.env*`, `vercel.json`, `js/lots-photos.json` e `images/lotes/` — igual ao antigo `.vercelignore` da Vercel (sem ele, tudo isso seria publicado).
   > Alternativa **sem build**: apague o Build command, deixe a saída em `/` (raiz) — aí os arquivos de desenvolvimento vão ao ar junto (não há segredo versionado, mas `supabase/*.sql` e `scripts/` ficam acessíveis).

6. **Save and Deploy** → pronto. Você recebe uma URL `https://oficial-leilao.pages.dev`.
   A cada `git push` na `main` um novo deploy é publicado (igual à Vercel); branches diferentes geram URL de preview.

> **Importante:** o Git integration do Pages **não** lê `.vercelignore` — ele publica tudo que está versionado. Por isso `.env`, `ADMIN-LOGIN.txt` e `images/lotes/` **não são commitados** (`.gitignore`), e nenhum segredo está no repositório. Só sobem `scripts/`, `supabase/*.sql` e `*.md` (sem credenciais). Se quiser, dá para esconde-los com um build step que copie só o site para `dist/`.

## 2. Domínio próprio (opcional, depois do primeiro deploy)

1. Seu domínio precisa estar no Cloudflare (troque os *nameservers* na registradora) — assim o apex (`seudominio.com.br`) funciona direto.
2. No projeto: **Custom domains** → **Set up a domain** → informe o domínio → **Continue** (com o domínio no Cloudflare tudo é automático).

## 2.1. O domínio ainda está na Vercel (é o caso de `leiloes-copart.com`)

Sintoma: `https://www.leiloes-copart.com/` responde com o header **`x-vercel-id`** e mostra a versão ANTIGA do site (HTML com `?v=37`, **sem a seção do mapa** — o build de 26/10), mesmo com o repositório já conectado ao Pages. Ou seja: o DNS já está no Cloudflare, mas o **origem** continua sendo a Vercel.

Para o domínio passar a servir o Pages:

1. Confirme o nome/caminho do projeto: **Workers & Pages → seu projeto** — no topo aparece a URL `<projeto>.pages.dev`. **Abra ela primeiro**: tem que mostrar o site ATUAL (`?v=70`, com o mapa "Onde estamos" e os 4 banners). Se essa URL estiver quebrada, o problema é o build (Deployments → ver o log) e não o domínio.
2. No projeto: **Settings → Domains** (ou aba **Custom domains**) → **Set up a domain** → informe `leiloes-copart.com` → **Continue**. Repita para `www.leiloes-copart.com`.
3. Como a zona já está no Cloudflare, o registro é criado/apontado sozinho. Se aparecer aviso de que **já existe um registro apontando para a Vercel** (`cname.vercel-dns.com` ou IP antigo): **DNS → registros do domínio → delete/edite o registro antigo** deixando o Pages criar o dele (ou cole o alvo `*.pages.dev` que o Pages mostrar).
4. Aguarde alguns minutos e teste de novo. Confirmação de que funcionou: a resposta **não tem mais `x-vercel-id`** e o HTML traz `?v=70` + a seção `.mapsec` (mapa).

> Enquanto o domínio estiver na Vercel, **nenhum `git push` chega ao ar** — por isso mapa e banners parecem "quebrados"/desatualizados no site publicado.

Depois do domínio no Pages, **delete o projeto na Vercel** (Settings → Danger Zone) para não existir dois deploys disputando o mesmo endereço.

## 2.2. Situação em 28/10/2026 (fim da tarde): domínio na Hostinger, site QUEBRADO

Teste no site publicado: `https://leiloes-copart.com/` passa pelo Cloudflare (DNS `vera`/`ignacio.ns.cloudflare.com`, proxy ligado), mas o **origem é a Hostinger** (header `x-hcdn-request-id`). Lá só existe o **`index.html`** (`?v=71`); **todo o resto** — `css/styles.css`, `js/*.js`, `images/*` — devolve a página **"Parked Domain name on Hostinger DNS system"** (HTML com status 200). Resultado: home sem estilo, sem banners, sem lotes e sem mapa. `oficial-leilao.pages.dev` **não existe** (o projeto Pages não foi criado com esse nome).

Escolha **um** dos caminhos:

**A) Hostinger (o que está ligado hoje)**
1. Na raiz do projeto: `node scripts/build-pages.js` e compacte o `dist/` (ou use o `site-hostinger.zip` já gerado na raiz — 86 entradas, 1,55 MB).
2. hPanel → **Sites → Gerenciador de Arquivos** → pasta **`public_html`** do domínio `leiloes-copart.com` → apague o `index.html` solto e qualquer página padrão da Hostinger (`default.php`/parking).
3. **Enviar** → `site-hostinger.zip` → botão direito → **Extrair** dentro de `public_html` (as pastas `css/`, `js/`, `images/` e o `.htaccess` têm de ficar **direto** em `public_html`, não em subpasta). Ative "mostrar arquivos ocultos" para ver o `.htaccess`.
4. Se a Hostinger mostrar o domínio como "estacionado"/sem plano, ele precisa estar **vinculado a um plano de hospedagem** (Sites → Adicionar site → domínio existente); senão continua respondendo a página de parking.
5. Cloudflare → **Caching → Purge Everything**. Teste: `https://leiloes-copart.com/js/site.js?v=71` deve abrir **JavaScript**, não HTML.
6. Na Hostinger **cada mudança exige reenviar** o `dist/` (não há deploy automático pelo GitHub).

**B) Cloudflare Pages (recomendado — deploy automático a cada `git push`)**
Seguir as seções 1 e 2.1. Na hora de anexar o domínio, o Cloudflare vai avisar que já existe registro A/CNAME apontando para a Hostinger: apague esse registro e deixe o Pages criar o dele.

O `.htaccess` (no repo e no `dist/`) é o equivalente de `_redirects` + `_headers` para a Hostinger (rota `/br`, headers de segurança, `noindex` no painel, cache). A Pages ignora o `.htaccess`, a Hostinger ignora `_redirects`/`_headers` — os três podem ficar juntos.

## 3. Supabase — obrigatório antes de testar login

A `Site URL` e as `Redirect URLs` do Supabase continuam apontando para a Vercel/local. Sem isso, login e "Esqueci minha senha" falham no domínio novo.

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://oficial-leilao.pages.dev` (ou seu domínio)
- **Redirect URLs:** adicione `https://oficial-leilao.pages.dev/*` e o domínio próprio `https://seudominio.com.br/*` (mantendo os antigos enquanto houver testes locais)

> **Migração nova no Supabase (SQL Editor):** rode `supabase/006_visitas_lote.sql` — ativa o contador REAL de visualizações na página do lote (sem ele, o campo "Visualizações" fica vazio). Ordem completa das migrações em `DEPLOY-VERCEL.md`, seção 1.1.

## 4. O que já foi migrado do `vercel.json`

| Vercel | Cloudflare Pages |
|---|---|
| `cleanUrls` / `trailingSlash: false` | **Nativo** — Pages serve `lotes` a partir de `lotes.html` e redireciona `lotes.html` → `lotes` |
| `rewrites: /br → /index.html` | `_redirects` (proxy 200) |
| `/br/` → `/br` (301) | `_redirects` (301) |
| headers de segurança (nosniff, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy) | `_headers` (nosniff/Referrer-Policy já são padrão do Pages) |
| `noindex`/`no-store` em `/admin*` e `/redefinir-senha*` | `_headers` |
| `Cache-Control` de `css/`, `js/` (1 ano, immutable) e `images/` (7 dias) | `_headers` |

`vercel.json` e `.vercelignore` podem ficar no repo (inofensivos) ou serem apagados depois que a Vercel for desativada — a Cloudflare não lê nenhum dos dois.

## 5. Ao final

- Confira no navegador: `/`, `/br`, `/lotes`, `/admin` (precisa de login), `/redefinir-senha`.
- Depois que o domínio estiver ativo na Cloudflare, **delete o projeto na Vercel** (Settings → Danger Zone) para evitar dois deploys concorrentes.
- `python scripts/serve-local.py` continua valendo para testes locais (`http://127.0.0.1:8000/`).
