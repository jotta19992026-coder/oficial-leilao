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
   | Build command | deixe **vazio** (ou `exit 0`) |
   | Build output directory | `/` (raiz do repositório) |
   | Root directory | vazio (raiz) |

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
