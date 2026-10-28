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

## 3. Supabase — obrigatório antes de testar login

A `Site URL` e as `Redirect URLs` do Supabase continuam apontando para a Vercel/local. Sem isso, login e "Esqueci minha senha" falham no domínio novo.

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://oficial-leilao.pages.dev` (ou seu domínio)
- **Redirect URLs:** adicione `https://oficial-leilao.pages.dev/*` e o domínio próprio `https://seudominio.com.br/*` (mantendo os antigos enquanto houver testes locais)

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
