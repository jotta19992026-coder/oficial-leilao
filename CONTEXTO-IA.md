# Contexto do projeto — Norte Leilões

> **Leia este arquivo antes de qualquer alteração.** Ele registra o estado atual do projeto para que outra IA (ou pessoa) consiga continuar sem perder o contexto. **Atualize este arquivo ao final de cada tarefa.**

Última atualização: 26/10/2026
Última tarefa concluída: projeto preparado para a **Vercel** (guia `DEPLOY-VERCEL.md`, `vercel.json` com cabeçalhos/cache, `.vercelignore`, menu compatível com `cleanUrls`); cadastro **sem confirmação de e-mail** e com CPF/telefone/endereço; painel admin com **Clientes cadastrados** (busca + CSV) e **Gerar contrato**; migração `supabase/002_clientes_admin.sql` (**ainda precisa ser executada no SQL Editor**); cache busting em `?v=37`.

---

## 0. Onde paramos (resumo rápido)

- **Estado:** site estático funcionando localmente em `http://127.0.0.1:8000/`.
- **Catálogo:** 225 lotes e 1.985 fotos importados (`js/lots-data.js` + `images/lotes/`).
- **Cards:** fotos alternam automaticamente com fade/zoom, stagger e pausa no hover; a rotação continua mesmo com `prefers-reduced-motion` (sem zoom).
- **Botões:** CTAs por categoria ("Ver veículo", "Ver moto", "Ver embarcação", "Ver imóvel", "Ver equipamento"); não restam botões "Ver lotes"; bordas quadradas em CTAs/banners/controles, exceto o botão "Dar lance" (`.btn--bid`), que segue arredondado. O "Dar lance" é verde (#25D366, hover #1EBE5D).
- **Layout:** container com largura máxima de 1320px no desktop e padding fluido (`clamp(18px,2.2vw,40px)`); no mobile, grades e miniaturas foram ajustadas com `min-width:0`/`minmax(0,1fr)` para eliminar overflow horizontal.
- **Imagens:** galeria do detalhe em 4:3 com `object-fit:contain` (foto inteira, sem corte inferior); cards também usam `contain`, com fundo cinza (`#d9dde3` → `#eef1f5`) durante a troca automática.
- **Header:** logo à esquerda; navegação e botão "Entre ou cadastre-se" sólido à direita no desktop. Entre 981–1200px o header compacta (logo, gaps e fonte menores). No mobile (≤560px) o header usa grid `auto minmax(0,1fr) auto`: logo maior (46 px; 42 px ≤400; 40 px ≤360), botão "Entre ou cadastre-se"/"Minha conta" compacto, quadrado (cantos retos) e centralizado entre a logo e o hambúrguer, em uma única linha; sem overflow de 320 a 560 px. O header fica fixo no topo ao rolar (`#site-header` sticky) e as âncoras usam `scroll-margin-top:72px`. Quando logado, o botão vira o bloco branco "Minha conta".
- **Lances:** campo "Valor do lance" abaixo do botão verde, com botões −/+, formatação em reais, botão refletindo o valor digitado e validação do lance mínimo.
- **Rodapé:** logo sobre placa branca arredondada (visível no fundo azul-escuro); nome da marca não aparece mais no bloco.
- **Textos públicos:** nenhuma menção a "demo", "demonstração" ou "fictício" em HTML/JS/CSS.
- **Ao vivo:** selo vermelho pulsante (escala/brilho) no card e na página do lote, além do ponto branco pulsante; funciona mesmo com `prefers-reduced-motion`.
- **Banners:** slider superior com 4 imagens, **todas no formato do 1º banner (Bradesco)**: 1140×297 no desktop e 780×747 em ≤560 px, cada slide com `<picture>` (desktop + mobile). Arquivos: Bradesco `images/web-6d8e7f4041.webp` / `images/banner-mobile.webp`; Pan `images/web-1e63dc7f3f.webp` / `images/banner-pan-mobile.webp`; RIZA `images/banner-riza.webp` / `images/banner-riza-mobile.webp`; Daycoval `images/banner-daycoval.webp` / `images/banner-daycoval-mobile.webp`. As artes RIZA/Daycoval (originais 1000×400) e o Pan mobile foram **recompostas** por `scripts/recompose-banners.py` (Pillow): no desktop o painel de texto e o logo mantêm a escala e a foto é estendida até 1140 px; no mobile o painel fica em cima e a foto + logo embaixo (como o Bradesco mobile); o Pan mobile reempilha título/logo, selos, veículos e horários. As artes originais continuam em `images/` (fonte do script). Como todos têm a mesma altura, o viewport não muda entre slides. Autoplay contínuo de 6 s (`js/banners.js`): não pausa em hover/foco/toque nem fora da tela; só pula o avanço com a aba oculta. Setas/dots reiniciam o timer. `images/banner-riza-desktop.webp` e `images/banner-daycoval-desktop.webp` são de uma tentativa anterior e não são usados.
- **Patrocinadores ("Bancos e Financeiras"):** função compartilhada `window.NLSponsorBadge(inicio, classe)` em `js/site.js` (lista `SPONSORS`) gera o selo `.sponsor` com os logos de `images/patrocinadores/` (bradesco, tokio-marine, safra, porto, santander, itau — 240×240 webp) deslizando lateralmente em loop por CSS (`@keyframes sponsorSlide`, 15 s = 6 × 2,5 s; trilha `.sponsor__track` com 6 logos + cópia do 1º). Usado em: cards de lote (`js/card.js`, `.lot__head`, 48 px), página do lote (`js/lote.js`, bloco `.sponsorline` "Comitentes — Bancos e Financeiras", 64 px `.sponsor--lg`) e cards de "Próximos leilões" na home (`<span class="event__sponsor" data-sponsors="N">`, preenchidos por `fillSponsors()` no `site.js`, 56 px). Cada selo começa num logo diferente (`animation-delay` negativo). Para trocar/adicionar logos: atualizar `SPONSORS` em `site.js` **e** largura/keyframes no CSS (n+1 itens).
- **Selos de segurança:** `images/selos/leilao-seguro.png` (260×44) e `images/selos/ssl-site-seguro.png` (198×88), injetados por `footerHTML()` em `js/site.js`: faixa branca `.trustbar` ("Ambiente seguro e verificado") logo acima do rodapé e bloco `.footer__trust` (placas brancas) na 1ª coluna do rodapé, em todas as páginas.
- **Campanhas (cards de texto):** cada card é uma seção `.promos.promos--single` com `.promo-card--wide` (layout horizontal no desktop, empilhado ≤760 px), distribuídas na home: veículos após "Próximos leilões", motos após "Leilões em destaque" e pesados acima do rodapé.
- **Edital:** página do lote exibe ficha com leilão, data, encerramento, leiloeiro, matrícula, comitente, comissão, pagamento e retirada; `edital.html` ganhou forma de pagamento, retirada e central de atendimento.
- **WhatsApp:** botão flutuante no verde oficial `#25D366`.
- **Backend (Supabase, ativo):** projeto `srxtmyhcfncscjvyibhg` (`https://srxtmyhcfncscjvyibhg.supabase.co`), schema de `supabase/schema.sql` executado, Auth por e-mail com Site URL `http://127.0.0.1:8000`. O site lê lotes/fotos do banco, faz login/cadastro pelo Supabase Auth e grava lances só via `place_bid`. Chave do navegador: **publishable** `sb_publishable_9R2e…` em `js/supabase.js` (pública por definição; a proteção é a RLS). A **secret key** fica só no `.env` (scripts Node), nunca no navegador.
- **Fotos e catálogo no Supabase:** 1.985 fotos enviadas (0 falhas) para `lot-photos/lotes/<id>/…` por `scripts/upload-images-supabase.js`; mapa em `js/lots-photos.json`. `scripts/import-lotes-supabase.js` gravou 8 `auctions` (`LO-2026/NN`), 225 `lots` (`published`, ids iguais aos de `lots-data.js`) e 1.985 `lot_photos`. `js/lots-data.js` continua carregado só como **fallback** se o Supabase não responder (aí as fotos apontam para `images/lotes/`, que não vai para o deploy).
- **Segredos:** a URL e a secret key tinham sido preenchidas no `.env.example`; foram movidas para `.env` (ignorado pelo `.gitignore` e pelo novo `.vercelignore`) e o `.env.example` voltou a ser só modelo. `.vercelignore` também exclui `scripts/`, `supabase/`, `images/lotes/`, `AGENTS.md` e `CONTEXTO-IA.md` do deploy.
- **Cache busting:** `?v=37` em todas as páginas.
- **Pendências do dono (passo a passo em `DEPLOY-VERCEL.md`):** (1) rodar `supabase/002_clientes_admin.sql` no SQL Editor; (2) desligar **Confirm email** em Authentication → Sign In / Providers → Email; (3) criar o admin (Authentication → Users → Add user com *Auto Confirm* + `update public.profiles set role='admin' where email='...'`); (4) publicar na Vercel e apontar o domínio; (5) colocar o domínio em Authentication → URL Configuration.
- **Recusado:** "lances automáticos para incentivar os usuários" (lances da casa/robô para inflar o preço = *shill bidding*, fraude contra o arrematante). O antigo "Lance automático" do admin já tinha sido removido. Alternativas legítimas sugeridas: lance automático **do próprio cliente** até um teto (proxy bidding), aviso de "você foi superado", preço inicial atrativo e destaque de lotes encerrando.
- **Cadastro:** coleta nome, e-mail, **CPF** (validado com dígitos verificadores), **telefone com DDD** e endereço (opcional). Vão em `user_metadata` e o gatilho `handle_new_user` (migração 002) copia para `profiles.cpf/phone/address`. Com "Confirm email" desligado, o `signUp` devolve sessão e o cliente entra direto (o código ainda trata o caso com confirmação).
- **Painel admin:** KPIs; **Clientes cadastrados** via `rpc('admin_clients')` (nome, e-mail, CPF, telefone, endereço, cadastro, último acesso, nº de lances, maior lance, lotes liderando), com busca e **Exportar CSV** (`;` + BOM, abre no Excel); **Gerar contrato**: escolhe cliente → lotes em que ele deu lance (`rpc('admin_client_lots')`, marca "vencendo") → valor = maior lance dele → abre o contrato em nova janela para imprimir/PDF (`js/contract.js`, mesmo modelo de `contrato.html`); avisa se o cliente não é o maior lance. Sem a migração 002, a lista mostra "Execute supabase/002_clientes_admin.sql…".

---

## 1. Visão geral

Site estático de leilões (HTML + CSS + JavaScript puro, sem build) com backend **Supabase** (Postgres + Auth + Storage + Realtime) acessado direto do navegador pelo `supabase-js` (CDN, versão fixa 2.45.4). Esquema em `supabase/schema.sql`.

- Raiz do projeto: `C:\Users\Eder Santos\Downloads\oficial-leiloes-codigo-fonte`
- Servidor local usado: `python -m http.server 8000 --bind 127.0.0.1` (rodando em `http://127.0.0.1:8000/`)
- Pasta de origem das fotos: `C:\Users\Eder Santos\Desktop\Leilão`
- Páginas principais: `index.html`, `leiloes.html`, `lotes.html`, `lote.html` (detalhe `?id=N`), `admin.html`, `admin-login.html`, `edital.html`.

### Ordem dos scripts nas páginas (importante)

```html
<script src="js/lots-data.js?v=37"></script>  <!-- catálogo importado (225 lotes) -->
<script src="js/data.js?v=37"></script>       <!-- utilitários + fallback -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="js/supabase.js?v=37"></script>   <!-- cria window.NLSupa (URL + publishable key) -->
<script src="js/auth.js?v=37"></script>
<script src="js/store.js?v=37"></script>
<script src="js/site.js?v=37"></script>
<script src="js/timers.js?v=37"></script>
<script src="js/card.js?v=37"></script>
<script src="js/lotes.js?v=37"></script>      <!-- ou index.js/lote.js/admin.js -->
```

Todas as páginas HTML usam `?v=37` (cache busting).

### Fluxo de dados

1. `js/supabase.js` cria `window.NLSupa` (cliente) e `window.NL_SUPABASE.storageKey` (chave da sessão no localStorage: `sb-srxtmyhcfncscjvyibhg-auth-token`).
2. `js/auth.js` (`window.NLAuth`): `current()` **síncrono** (lê a sessão salva; atualizado por `onAuthStateChange`), `ready` (Promise), `login`/`signup`/`logout` devolvem **Promise** `{ok, error, needsConfirm}` com mensagens em português. Com confirmação de e-mail ligada, o cadastro mostra "confirme pelo link" em vez de entrar. `window.NLAdmin`: login + `rpc('is_admin')`; `require()` é Promise e redireciona quem não é admin.
3. `js/store.js` (`window.NLStore`): `ready` carrega uma vez `lots` publicados com `lot_photos` embutidas e converte cada linha para o formato antigo de `lots-data.js` (`price` = lance atual `current_price ?? price`, `basePrice`, `increment`, `bids` = `bid_count`, `endsAt` = `ends_at`, `auction` = `auction_label`, `photos`). Depois `lots()`/`lot()`/`bids()` são síncronos (cache). Se o Supabase falhar, cai para `NL_LOTS` (`source()` = `'local'`). Também: `placeBid(id, valor)` → `rpc('place_bid')`; `history(id)` → `rpc('lot_bid_history')`; `refreshLot(id)`; `watchLot(id, cb)` (realtime em `lots`); `admin.*` (lotes, usuários, lances, contagens, inserir/excluir lote, enviar capa ao bucket + `replace_lot_photos`).
4. **Páginas esperam `NLStore.ready` antes de renderizar** (`index.js`, `lotes.js`, `lote.js`, `contrato.js`). `card.js` monta os cards (cronômetro com `data-ends-at` = prazo real); `lote.js` faz detalhe/galeria/lances.
5. `js/lots-data.js` + `js/data.js` (`NL_LOTS`, `NL_DATEINFO`, `NL_EDITAL`, etc.) continuam: utilitários e fallback offline.

---

## 2. O que foi feito nesta tarefa

- Importados **225 lotes** e **1.985 fotos** da pasta `Desktop\Leilão`.
- Fotos copiadas para `images/lotes/<id>/<arquivo>` (112,9 MB no total).
- Gerado `js/lots-data.js` (270 KB) com todos os dados, fotos e descrições.
- `js/data.js` passou a usar o catálogo importado (mantendo os 10 lotes demo como fallback).
- `js/lote.js` agora exibe **galeria com todas as fotos** (clique nas miniaturas troca a principal), especificações por categoria e **descrição + observações** por lote.
- Novas categorias: `imovel` (Imóveis) e `equipamento` (Equipamentos).
- Filtros de `lotes.html`, chips da home e agenda de `leiloes.html` atualizados.
- Home: contador “Lotes disponíveis” passou de 215 para 225; datas 10/11 e 12/11 adicionadas ao seletor.
- CSS: miniaturas clicáveis e destaque da foto ativa (`.thumbs span`).

### Fonte e duplicatas

A pasta `Desktop\Leilão` contém 8 subpastas; apenas 4 são conjuntos únicos:

- `fotos_lotes_parte1de4_lotes001-047` — 47 lotes
- `fotos_lotes_parte2de4_lotes048-099` — 52 lotes
- `fotos_lotes_parte3de4_lotes100-166` — 67 lotes
- `fotos_lotes_parte4de4_lotes167-225` — 59 lotes

As pastas `fotos_lotes_parte01...`, `parte02...`, `parte03...`, `parte04...` e `fotos_lotes_parte1de4_lotes001-047 (1)` são duplicatas exatas e foram ignoradas. O importador também remove duplicatas exatas de imagem dentro de cada lote (hash MD5) e arquivos corrompidos de 24 bytes. Resultado: 117 arquivos ignorados (2.102 → 1.985).

- O padrão dos nomes das pastas é:
  `NNN - Leilao <número> - Lote <número> - <TÍTULO> (id <id>)`
- O `id` do lote é usado como pasta em `images/lotes/<id>/`.
- Imagens seguem a ordem `01_principal.jpg`, `02.jpg`, ... (`.jpg` ou `.jpeg`).

---

## 3. Mapa dos leilões importados

| Leilão | Data | Categoria | Lotes | ids (exemplos) |
|---|---|---|---|---|
| 5  | 26/10/2026 | moto | 70 | 401, 399, 198... |
| 20 | 26/10/2026 | carro | 54 | 571, 566, 567... |
| 32 | 27/10/2026 | carro | 51 | 941, 937, 938... |
| 43 | 27/10/2026 | pesado | 15 | 1110–1124 |
| 34 | 07/11/2026 | nautico | 19 | 1006–1075 |
| 39 | 07/11/2026 | carro | 6 | 1079–1084 |
| 41 | 10/11/2026 | equipamento | 5 | 1090–1094 |
| 40 | 12/11/2026 | imovel | 5 | 1085–1089 |

Totais por categoria: **moto 70, carro 111, pesado 15, náutico 19, imóvel 5, equipamento 5 = 225**.

Datas usadas em `auction` (`Leilão X — DD/MM`) e em `auctionDate` (DD/MM/2026). O status é derivado em `NL_DATEINFO` a partir de `NL_TODAY = 25/10/2026` (janela de 3 dias = “Aberto para lances”; depois “Em breve”). Leilões 5 e 20 ficam abertos; os demais “Em breve”.

`ends` é um offset de contagem regressiva usado por `js/timers.js` e por `js/lote.js` (ex.: `+1d 6h`, `+13d`).

---

## 4. Estrutura de um lote em `js/lots-data.js`

```js
{
  id: 401,                       // id numérico
  n: "01",                       // número do lote (texto, preserva zeros)
  title: "BMW G 310",            // título sem o ano
  cat: "moto",                   // carro | moto | pesado | nautico | imovel | equipamento
  catLabel: "Moto",
  year: "2024/2024",             // ou "Não informado" / "—"
  km: "Não informado",           // "—" para imóvel/equipamento
  city: "Consultar edital",      // imóveis têm cidade real
  price: 25000,                  // ESTIMATIVA (ver seção 6)
  bids: 0,
  media: "m2",                   // classe de gradiente (c1/c2/c3, m1..., p1...)
  ends: "+1d 6h",
  auction: "Leilão 5 — 26/10",
  auctionNum: 5,
  auctionDate: "26/10/2026",
  photos: ["images/lotes/401/01_principal.jpg", ...],
  photo: "images/lotes/401/01_principal.jpg",  // capa
  desc: "...",                   // descrição principal exibida no detalhe
  obs: "..."                     // observações (laudo/condições)
}
```

`js/data.js` também aceita os campos antigos `media`, `photo`, `price`, `bids`, `ends` e `auction`; os 10 lotes de fallback continuam intactos.

---

## 5. Arquivos criados/alterados

| Arquivo | O que mudou |
|---|---|
| `js/lots-data.js` | **NOVO** — catálogo com 225 lotes, 1.985 fotos e descrições (gerado automaticamente). |
| `images/lotes/**` | **NOVO** — 1.985 fotos (112,9 MB) em `images/lotes/<id>/`. |
| `scripts/import-lotes.js` | **NOVO** — script de importação/regeração. Usa caminho relativo ao projeto. |
| `js/data.js` | Usa `NL_REAL_LOTS`; novas categorias em `NL_CATS`/`NL_IMG`; `NL_IMG_FOR` considera `photos[0]`. |
| `js/lote.js` | Galeria completa, troca de foto, specs por categoria, descrição/observações do lote. |
| `css/styles.css` | Miniaturas clicáveis e borda da foto ativa. |
| `lotes.html` | Filtros de Imóveis e Equipamentos. |
| `index.html` | Chips de Imóveis/Equipamentos; datas 10/11 e 12/11; total 225. |
| `leiloes.html` | 8 eventos com números de leilão, categorias e links com `cat` + `date`. |
| Todos os `*.html` | Inclusão de `js/lots-data.js` antes de `js/data.js` e bump de cache para `?v=13`. |
| `js/card.js` | Botão do card usa rótulo por categoria (`CTA`), com fallback "Ver detalhes"; rotação automática das fotos com fade, stagger, pausa no hover e `IntersectionObserver`. |
| `css/styles.css` | Botão flutuante do WhatsApp com verde oficial `#25D366` (hover `#1EBE5D`); fade/zoom na troca de foto dos cards (respeitando `prefers-reduced-motion`); bordas quadradas nos botões (`.btn`, banners e controles), exceto `.btn--bid` (Dar lance), que permanece arredondado; `.btn--bid` agora é verde (`#25D366`, hover `#1EBE5D`) e o pulso (`bidPulse`) usa o mesmo verde. |
| `edital.html` | Botão final passou de "Ver lotes do leilão" para "Ver itens do leilão". |
| `minha-conta.html` | Link "Ver lotes" passou a "Ver veículos". |
| `js/index.js` | Link "Ver todos os lotes" passou a "Ver todos os itens". |
| `js/lote.js` | Fallback "Ver todos os lotes" passou a "Ver todos os itens"; botão "Dar lance" recebeu a classe `.btn--bid` (arredondado); galeria em 4:3 com `contain`; ficha "Informações do edital" (leilão, data, leiloeiro, matrícula, comitente, comissão, pagamento e retirada). |
| `js/data.js` | Novo `window.NL_EDITAL(lot)` com a ficha fictícia do edital derivada do leilão. |
| `js/banners.js` | Slider de banners passou a avançar automaticamente (6 s) também com `prefers-reduced-motion`; nesse caso o CSS remove a transição deslizante. Agora também sincroniza a altura do `.banners__viewport` com o slide ativo (inclusive em resize, `load` e carregamento das fontes). |
| `css/styles.css` | Banner responsivo em todas as larguras: controles (setas + dots) em barra própria abaixo da imagem, viewport com transição de altura, promo em `display:block` preservando a proporção da imagem (`height:auto`), slides com `min-width:0`, e mobile compacto (≤760 px empilha; ≤560 px oculta a figura e reduz tipografia/controles). |
| `css/styles.css` | Header mobile (≤560 px): grid `auto minmax(0,1fr) auto` com logo maior (46/42/40 px), botão "Entre ou cadastre-se"/"Minha conta" compacto e quadrado (fonte 0,72/0,66/0,62 rem, ícone 22/20/18 px, `border-radius:0`) centralizado entre a logo e o hambúrguer; header fixo no topo (`#site-header` sticky), menu abaixo e `scroll-margin-top` nas âncoras; sem overflow em 320–560 px. |
| `images/banner-mobile.webp` | **NOVO** — arte mobile 780×747 da promo (texto grande em cima, caminhão/carro/moto embaixo), usada via `<picture>` em ≤560 px. |
| `index.html` / `css/styles.css` | Promo com `<picture>`: fonte mobile `banner-mobile.webp` em ≤560 px e desktop `web-6d8e7f4041.webp`; `aspect-ratio` reserva a altura (390 px → banner de ~374 px). |
| `index.html` / `css/styles.css` | slider superior com 4 banners em `<picture>` no formato do Bradesco (1140/297 desktop, 780/747 mobile, regra única `.banner--promo img`); 3 seções `.promos--single` com `.promo-card--wide` distribuídas pela home (veículos, motos, pesados acima do rodapé). `.promos__grid` continua no CSS, sem uso atual. |
| `js/site.js` / `js/card.js` / `js/lote.js` / `css/styles.css` / `images/patrocinadores/` / `images/selos/` | selo de patrocinadores animado (`window.NLSponsorBadge`, `.sponsor`, `.sponsor__track`, `.sponsor__img`, `.sponsor--lg`, `.sponsorline`, `.event__sponsor`, `@keyframes sponsorSlide`) nos cards, na página do lote e nas datas da home; selos de segurança (`.trustbar`, `.footer__trust`). |
| `scripts/recompose-banners.py` | **NOVO** — gera `banner-riza(-mobile).webp`, `banner-daycoval(-mobile).webp` e `banner-pan-mobile.webp` a partir das artes originais. Uso: `python scripts/recompose-banners.py images images` (requer `pip install pillow`). |
| `images/web-1e63dc7f3f.webp`, `images/Banner-2026-10-26-11h00-RIZA-AF1.webp`, `images/Banner-2026-11-05-12h00-Daycoval-.webp` | **NOVOS** — banners enviados pelo usuário, copiados de Downloads para `images/`. |
| `js/banners.js` | Autoplay de 6 s pausa fora da tela, no hover/foco/toque ou com a aba oculta; ao voltar para a tela, o timer reinicia. |
| `css/styles.css` | `.promo-card__title em` em azul claro `#8ab8ea` para contraste no fundo navy. |
| `js/site.js` | Rodapé passou a exibir apenas a logo (nome "Leilão Oficial" removido do bloco da marca); texto final sem menções a demonstração. |
| `css/styles.css` | Galeria 4:3 + `contain`; cards com `contain` e fundo de transição cinza; header mobile em grid (o botão de conta foi movido para o lado da logo em 26/10); selos "Ao vivo" pulsantes; estilos da ficha do edital. |
| `edital.html` | Leiloeiro "Ricardo Almeida (matrícula JUC/PR 12.345/2026)"; novas linhas de forma de pagamento, retirada e central de atendimento; textos sem menções a demonstração. |
| `css/styles.css` | Container com `--maxw:1320px` e padding fluido; `.detail>*{min-width:0}` e `.thumbs{grid-template-columns:repeat(4,minmax(0,1fr))}` para eliminar overflow no mobile; estilos de `.bidamount`; logo do rodapé sobre placa branca; ficha do edital empilhada no mobile. |
| `js/lote.js` | Campo "Valor do lance" abaixo do botão, com +/−, formatação em reais, atualização do rótulo do botão e validação do mínimo; textos públicos sem menções a demonstração. |
| `js/data.js` | Ficha do edital com número `LO-2026/NN`, matrícula `JUC/PR 12.345/2026` e comitente "Leilão Oficial"; comentários e textos sem "demo". |
| `js/supabase.js` | **NOVO** — cliente Supabase (URL + publishable key) compartilhado. |
| `js/auth.js` | **REESCRITO** — Supabase Auth (e-mail/senha), `current()` síncrono, métodos assíncronos, `NLAdmin` via `is_admin()`. Não usa mais `nl_users`/`nl_session`/`nl_admin_session`. |
| `js/store.js` | **REESCRITO** — lotes/fotos do Supabase com fallback local; `placeBid` (`place_bid`), `history` (`lot_bid_history`), `refreshLot`, `watchLot` (realtime), `admin.*`. Não usa mais `nl_bids`/`nl_custom_lots`/`nl_lot_photos`. |
| `js/lote.js` | Espera `NLStore.ready`; incremento e prazo do banco; histórico público; lance via `placeBid` (botão desabilitado durante o envio; erro do banco exibido e lote relido); realtime + releitura a cada 20 s. |
| `js/index.js` / `js/lotes.js` / `js/contrato.js` / `js/card.js` / `js/timers.js` / `js/forms.js` / `js/site.js` | Renderizam após `NLStore.ready`; "Vencendo: Você" só quando o maior lance é do usuário logado; cronômetro aceita `data-ends-at`; login/cadastro/logout assíncronos. |
| `js/admin.js` / `admin.html` | **REESCRITO** — painel lê/escreve no Supabase (RLS de admin): KPIs, usuários (`profiles`), últimos 200 lances, lotes (excluir, trocar/remover capa com upload ao bucket), adicionar lote publicado (encerra em 48 h). Guarda do `admin.html` checa a sessão do Supabase. **Removido o "Lance automático"** (gerava lances com nomes inventados; com lances reais isso seria lance falso); ficou só a atualização automática da tela. |
| `supabase/002_clientes_admin.sql` | **NOVO** — `profiles.cpf/phone/address`, novo `handle_new_user`, confirma e-mails pendentes, funções `admin_clients()` e `admin_client_lots(uuid)` (só admin; `#variable_conflict use_column`). **Executar no SQL Editor.** |
| `js/contract.js` | **NOVO** — `NLContractHTML(dados)` (modelo único do contrato) e `NLContractPrint(dados)` (nova janela + impressão). Usado por `contrato.js` e `admin.js`. |
| `cadastro.html` / `js/forms.js` / `js/auth.js` | Campos CPF, telefone e endereço; `NLAuth.signup(nome, email, senha, extra)` valida CPF/telefone; `NLAuth.profile()` lê o perfil do usuário (usado para pré-preencher `contrato.html`). |
| `admin.html` / `js/admin.js` / `js/store.js` | Seções **Gerar contrato** e **Clientes cadastrados** (substituem "Usuários cadastrados"); `NLStore.admin.clients()`/`clientLots()`. |
| `vercel.json` / `.vercelignore` / `DEPLOY-VERCEL.md` | Cabeçalhos de segurança (HSTS, Permissions-Policy), `noindex`/`no-store` em `/admin*`, cache 1 ano em `css/`/`js/` (versionados por `?v=`) e 7 dias em `images/`; `.vercelignore` exclui `.env*`, `scripts/`, `supabase/`, `images/lotes/`, `js/lots-photos.json`, `*.md`; guia completo de Supabase + Vercel + domínio. |
| `js/site.js` | Destaque do menu funciona com `cleanUrls` (`/lotes` → `lotes.html`). |
| `scripts/import-lotes-supabase.js` | **NOVO** — importa `lots-data.js` + `lots-photos.json` para `auctions`/`lots`/`lot_photos` (idempotente; preserva `current_price`/`bid_count`; prazos com âncora fixa). |
| `.env` / `.env.example` / `.vercelignore` | Credenciais movidas para `.env`; `.env.example` sem segredos; `.vercelignore` **NOVO**. |
| `js/lots-photos.json` | **GERADO** — mapa `id → URLs públicas` das 1.985 fotos. |
| `supabase/schema.sql` | **NOVO** — perfis, leilões, lotes, fotos, lances, auditoria, RLS, bucket `lot-photos`, funções `place_bid`, `lot_bid_history` e `is_admin`. |
| `js/site.js` / `css/styles.css` | Header: logo à esquerda; no desktop (>980px) nav e botão "Entre ou cadastre-se" à direita; em ≤560px o botão de conta (compacto e quadrado) fica centralizado entre a logo e o hambúrguer (grid `auto minmax(0,1fr) auto`), com bloco branco "Minha conta" quando logado; o header mobile fica fixo no topo ao rolar. |
| `scripts/upload-images-supabase.js` | **NOVO** — envia as fotos para `lot-photos` pela API REST do Storage, com `apikey` (secret key) e `Authorization` (apenas JWT legado); retry, concorrência, `x-upsert`, `--dry-run`/`--only`, mapa `js/lots-photos.json`. |
| `.env.example` / `.gitignore` | **NOVOS** — modelo de `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; `.env` e mapas preview/partial ficam fora do versionamento. |
| `scripts/package.json` | **NOVO** — força CommonJS na pasta `scripts` (o `package.json` do diretório pai declara `type: module`). |

---

## 6. Decisões e dados que NÃO são reais

- **Preços (`price`)** são estimativas geradas por regras de categoria/ano/marca. **Não são valores oficiais do leilão.**
- **Hodômetro (`km`)** = “Não informado”; **localização** = “Consultar edital” para veículos/equipamentos.
- **Descrições (`desc`)** e **observações (`obs`)** são textos gerados por template por categoria (não vieram de uma fonte oficial). Para trocar por descrições reais, edite `makeDesc`/`makeObs` em `scripts/import-lotes.js` e regenere, ou edite `js/lots-data.js` diretamente.
- **Ano/modelo** foi extraído do nome da pasta. Lotes sem ano em veículos ficam “Não informado” (ex.: id 1121 — CONSTELLATION 24.280 6.9 I6). O quadriciclo id 1015 foi interpretado como 2008/2008 (`-08-08`).
- **Cores/combustível/câmbio/portas/placa** para veículos continuam vindo de `NL_EXTRA` (derivados do id, fictícios).
- Os textos públicos não mencionam demonstração; ainda assim, preços, hodômetro, descrições e a ficha do edital continuam sendo placeholders internos, não dados oficiais.
- A ficha do edital usa leiloeiro, matrícula e número de exemplo (`LO-2026/NN`); ajuste em `js/data.js` (`NL_EDITAL`) e em `edital.html` quando os dados reais estiverem disponíveis.

---

## 7. Como reimportar/regenerar

Na raiz do projeto:

```powershell
node scripts/import-lotes.js
```

O script:

1. Localiza a pasta `Leilão` na Área de Trabalho do usuário.
2. Lê os conjuntos `fotos_lotes_parte1de4...` até `parte4de4...`.
3. Remove e recria `images/lotes/<id>/`, copiando as fotos válidas sem duplicatas.
4. Reescreve `js/lots-data.js` com o comentário de data/hora da geração.
5. Mostra o resumo (lotes, fotos, ignorados, totais por leilão).

Se a pasta de origem mudar, ajuste `SETS`/`AUCTIONS`/`IMOVEL_CITY` no script. Se os nomes das pastas mudarem, ajuste o regex de parsing.

### Enviar as fotos para o Supabase Storage

1. Crie o projeto no Supabase, abra o **SQL Editor** e execute todo o `supabase/schema.sql` (cria as tabelas e o bucket público `lot-photos`).
2. Copie a **Project URL** (`https://<ref>.supabase.co`) e crie/copie uma **Secret key** (`sb_secret_...`) em **Settings → API Keys**. A `service_role` legada (`eyJ...`) também funciona.
3. Na raiz, crie `.env` a partir de `.env.example` e preencha:
   `SUPABASE_URL=...` e `SUPABASE_SERVICE_ROLE_KEY=...` (nunca use a chave publishable/anon e nunca commite o `.env`).
4. Teste um lote: `node scripts/upload-images-supabase.js --only=1006` (7 fotos), confira em **Storage → lot-photos → lotes/1006**.
5. Envie tudo: `node scripts/upload-images-supabase.js` (1.985 fotos, concorrência 5). O script grava `js/lots-photos.json` com as URLs públicas; se houver falhas, grava `.partial.json` e pode ser reexecutado (`x-upsert`).
6. ✅ Feito em 26/10/2026 (1.985 fotos, 0 falhas). `images/lotes/` já está no `.vercelignore`.

### Importar/atualizar o catálogo no banco

```powershell
node scripts/import-lotes-supabase.js --dry-run   # mostra o que faria
node scripts/import-lotes-supabase.js             # grava auctions, lots e lot_photos
```

- Upsert por `id` (os ids de `lots-data.js`); **não** sobrescreve `current_price`/`bid_count`, então lances já dados sobrevivem. As fotos de cada lote importado são apagadas e regravadas a partir de `js/lots-photos.json`.
- `ends_at` = âncora fixa `2026-10-26T12:00-03:00` + deslocamento do catálogo (`"+1d 6h"` etc.), para reimportar sem empurrar prazos (ajustável com `--anchor=`). Com essa âncora: leilões de 26/10 encerram 27/10 18h/20h; 27/10 → 28/10 20h/18h; náuticos 07/11 e seguintes entre 08/11 e 13/11 (horário de Brasília). **São prazos de exemplo.**
- `increment` = `max(100, 1% do lance inicial arredondado a centenas)` — mesma regra que a tela usa, para o mínimo do `place_bid` bater com o mostrado.
- 8 leilões `LO-2026/05, 20, 32, 34, 39, 40, 41, 43` com dados do edital genérico; os 8 lotes mais antigos ficam `featured`.
- Novos lotes do painel recebem ids a partir de 10000.

Flags: `--dry-run` (não envia), `--only=<id>` (um lote), `--concurrency=<1-12>` (padrão 5).

---

## 8. Validações já executadas

- `node --check` em `js/data.js`, `js/lote.js`, `js/lots-data.js`, `js/card.js`, `js/lotes.js`, `js/index.js` — OK.
- Catálogo: 225 lotes, 225 ids únicos, 1.985 fotos, **0 fotos ausentes**, todas as descrições/observações preenchidas.
- HTTP: `index.html`, `js/lots-data.js`, `lote.html?id=1085` e fotos retornam 200 no servidor local.
- Renderização validada com Chrome headless (screenshots): home, listagem com 225 lotes, detalhe de moto (id 401), imóvel (id 1085) e equipamento (id 1092).
- Rotação automática validada via Chrome DevTools Protocol em `lotes.html`: as primeiras fotos passaram de `01_principal.jpg` para `02.jpg`, `03.jpg` e `04.jpg` em ~12 s, **mesmo com `prefers-reduced-motion: reduce`**.
- CTAs conferidos por categoria: `moto` → "Ver moto", `carro`/`pesado` → "Ver veículo", `nautico` → "Ver embarcação", `imovel` → "Ver imóvel", `equipamento` → "Ver equipamento".
- WhatsApp: `getComputedStyle(.whatsapp).backgroundColor` retornou `rgb(37, 211, 102)` = `#25D366`.
- Botões: `getComputedStyle` confirmou `border-radius: 0px` nos CTAs e nos controles dos carrosséis; `#d-bid` (`.btn--bid`) manteve `999px`.
- Botão "Dar lance": `getComputedStyle` confirmou `background-color: rgb(37, 211, 102)` = `#25D366` em `#d-bid`, com hover `#1EBE5D`; CTAs seguem azuis.
- Imagens: `.gallery` = `aspect-ratio: 4 / 3`, `.gallery__img` = `object-fit: contain`; `.lot__media` com gradiente cinza `rgb(217,221,227)` → `rgb(238,241,245)`.
- Mobile: emulação de 390 px via CDP confirmou header em grid com logo (x≈20), hambúrguer visível (x≈334) e card "Entre ou cadastre-se" em linha própria (largura 350, texto visível).
- Banners: via CDP, `#banners-track` passou de `translateX(0%)` para `translateX(-100%)` após ~7 s mesmo com `prefers-reduced-motion: reduce`.
- "Ao vivo": `getComputedStyle(.live).animationName` = `liveBadgePulse` (1.4 s, infinito), inclusive com redução de movimento; o ponto branco mantém `livePulse`.
- Rodapé: confirmado que `.footer .brand__name` não existe mais e `.footer .brand__logo` permanece; texto do bloco da marca vazio.
- Edital: `lote.html?id=401` exibe a ficha com leiloeiro "Ricardo Almeida", matrícula "JUC/PR 12.345/2026" e demais campos; link "Ver edital deste leilão" mantido.
- Desktop (1440 px): `.container` mede 1320 px, sem overflow horizontal; página do lote com galeria e bidbox equilibrados.
- Mobile (390 px): `.detail`, `.detail__media`, `.detail__info` e `.bidbox` medem 354 px; `scrollWidth` = 390, sem overflow; miniaturas em 4 colunas ajustadas.
- Campo "Valor do lance": valor inicial `25.300`, botão + levou a `25.900`, valor digitado `27.134` foi registrado e o campo avançou para `27.434`; rótulo do botão e dica de mínimo acompanham o valor.
- Rodapé: logo com fundo branco (105,9 × 46 px) e raio de 10 px, visível sobre o azul-escuro.
- Textos: busca por `demo|demonstra|fict` em HTML/JS/CSS não retorna ocorrências.
- Supabase: `supabase/schema.sql` criado; ainda **não executado** (depende do projeto/credenciais do usuário).
- Header (mobile fixo): validado via CDP em 1440/1024/981/768/560/430/400/390/375/360/340/320 px; em 981 px o botão "Entre ou cadastre-se" (197×45) termina a 22 px da borda; no mobile (≤560 px) a logo mede 118–102 px de largura (46–40 px de altura), o botão 160–136 px tem cantos retos e gaps iguais para logo/hambúrguer (107/42/41/36/29/29/19/9 px em 560/430/400/390/360/340/320 px, com 375 px entre 390 e 360); ao rolar 900 px o header permanece em top=0 em 390/360/320 px, o menu abre logo abaixo (y=59/55) e o link `#localizar` para 12–15 px abaixo do header; `overflow-x:clip` no html/body preservou o sticky sem rolagem lateral; sem overflow horizontal em 320–1440 px.
- Banners (novos): em 1440/1024/768/560/390/320 px, sem overflow horizontal; alturas dos slides Bradesco/Pan/RIZA/Daycoval = 375/375/576/576, 267/267/410/410, 200/200/307/307, 536/146/224/224, 374/102/156/156 e 306/83/128/128 px, respectivamente; o Bradesco mobile é servido por `images/banner-mobile.webp` via `<picture>` e mantém o banner grande no celular. A seção `.promos` renderizou 3 cards em 1440 (406×272) e 1024 (314×284), 2+1 em 768, e 3 cards empilhados em 560/390/320, sempre antes do rodapé e sem sobreposição.
- Admin/Vercel (v37), 26/10/2026: admin temporário (criado pela API admin e promovido com a secret key) entrou por `admin-login` → `admin.html`; KPIs 1/225/0, 225 linhas de lotes, lances vazios, atualização automática ativa; a lista de clientes mostrou o aviso da migração 002 (o `rpc admin_clients` responde 404 PGRST202 até a migração ser executada). Admin temporário removido (`profiles` vazio no fim). Cadastro: CPF `111.111.111-11` → "CPF inválido."; telefone `123` → "Informe um telefone com DDD." (validação antes da rede). **Não testados** (dependem da migração): lista de clientes, CSV e geração de contrato pelo painel.
- Supabase (v36), 26/10/2026: upload `--only=1006` (7 fotos, HEAD 200 `image/jpeg`) e completo (1.985/1.985, 0 falhas; amostras 200). Importação: 8 leilões, 225 lotes, 1.985 fotos; conferência com a **publishable key** pela mesma consulta do site: 225 lotes, 1.985 fotos embutidas, 0 lotes sem foto. RLS: anônimo vê 0 `bids` e 0 `profiles`, `insert` em `lots` = 401, `place_bid` anônimo = 401 "Faça login para dar lances.".
- `place_bid` (usuário temporário confirmado pela API admin, sem e-mail): abaixo do mínimo → 400 "O lance mínimo é 25300.00."; no mínimo → 200; repetir o valor → 400 (mínimo sobe para 25.600); lote passou a `current_price` 25.300 / `bid_count` 1; `lot_bid_history` mostrou só o primeiro nome; RLS devolveu ao usuário apenas o próprio lance.
- Navegador (Edge headless): home/listagem/detalhe com `source=supabase`, 225 lotes, fotos do Storage, cronômetro pelo `ends_at`, "Lance mínimo: R$ 25.300" no lote 401. Fluxo pela interface: login pelo formulário → "Minha conta" com o nome; no lote 401, botão registrou R$ 25.600, atualizou preço/contagem/mínimo/histórico; valor digitado abaixo do mínimo foi barrado. `admin-login` com conta não-admin → "Esta conta não tem permissão de administrador." e `admin.html` redireciona. **Dados de teste removidos** (lances, auditoria, usuário) e lote 401 restaurado (`current_price` null, `bid_count` 0). Painel com conta admin real **não testado** (nenhuma conta promovida ainda).
- Patrocinadores/selos (v34): screenshots da home (selos nas 4 datas, cada um com logo inicial diferente), de `lote.html?id=401` (bloco "Comitentes — Bancos e Financeiras" abaixo do título) e de `sobre.html` (faixa de selos acima do rodapé + selos no rodapé); `node --check` em site.js, card.js e lote.js OK.
- Patrocinadores/autoplay (v33): screenshots de `lotes.html` com 3,5 s de intervalo mostram os selos trocando de logo em cada card, com logos diferentes entre cards; dump do DOM da home após 13 s sem interação mostrou o 3º dot ativo (avanço em 6 s e 12 s).
- Banners recompostos (v32): screenshots headless dos slides Pan/RIZA em 1366 px e ~490 px — todos preenchem o quadro do Bradesco, sem faixas; textos, selos e logos íntegros.
- Banners padronizados (v31): screenshots headless em 1366 px (todos os slides com 1366×356) e mobile (RIZA inteira centralizada no quadro 780/747 com fundo desfocado); `scrollWidth` igual à largura da tela (sem overflow horizontal). Obs.: o Edge headless tem largura mínima de ~492 px, então capturas "390 px" saem com 492.
- Banners (autoplay): teste CDP em 390 px mostrou o slide avançando após 7 s no topo, permanecendo no slide 1 após 7 s com `.promos` em foco (fora da tela) e voltando a avançar após retornar ao topo; hover também pausa. A altura variável é intencional para não cortar as artes; por isso o timer é interrompido fora da tela.
- Promos: screenshots em 1440/390 e métricas confirmaram o grid e os CTAs; o segundo título de cada card usa `#8ab8ea` para contraste no fundo navy.
- Imagens para deploy: o diretório `images/lotes/` tem ~112,9 MB — acima do limite de 100 MB de upload do Vercel Hobby; a recomendação é migrar para Supabase Storage/Vercel Blob antes de publicar.
- Upload Supabase: `node --check scripts/upload-images-supabase.js` e `node --check scripts/import-lotes.js` — OK. `--dry-run` encontrou 1.985 fotos, 225 lotes e 112,9 MB; `--dry-run --only=1006` encontrou 7 fotos (0,2 MB).
- Upload Supabase (mock local): 7 arquivos de 1006 enviados com `Content-Type: image/jpeg`, `cache-control: 31536000`, `x-upsert: true`, `apikey` + `Authorization` para JWT legado; mapa preview gerado e removido depois. Upload real ainda não executado.
- Observação: o aviso de cookies aparece nas capturas por ser a primeira visita do perfil headless; não é erro.

---

## 9. Pendências / próximos passos sugeridos

0. **Supabase/Vercel — o que falta (ver `DEPLOY-VERCEL.md`):** (1) executar `supabase/002_clientes_admin.sql` e testar Clientes/CSV/Contrato no painel; (2) desligar "Confirm email"; (3) criar e promover a conta admin; (4) publicar na Vercel (Framework *Other*, sem build, sem variáveis) e apontar o domínio (A `@` 76.76.21.21, CNAME `www` cname.vercel-dns.com, ou os valores que a Vercel mostrar); (5) Site URL/Redirect URLs com o domínio; (6) captcha/rate limit no cadastro (sem confirmação de e-mail, contas falsas ficam mais fáceis); backups; (7) prazos reais em `lots.ends_at` e fechamento automático; (8) o painel ainda não edita lote existente; (9) eventos de `index.html`/`leiloes.html` continuam fixos no HTML; (10) se usar GitHub, `images/lotes/` (112,9 MB) vai para o repositório — considere colocá-la no `.gitignore` (ela só é necessária para reimportar fotos).
0a. **Imagens:** ✅ servidas pelo Supabase Storage. Ainda vale gerar WebP otimizado (galeria ~1600 px + miniatura ~400 px) — hoje são os JPG originais (112,9 MB no total).
1. Substituir os preços estimados por valores reais, se houver planilha/fonte.
1a. **Banners:** as artes têm proporções diferentes (Bradesco/Pan 1140×297; RIZA/Daycoval 1000×400), então o slider ajusta a altura e o conteúdo abaixo desloca ao trocar de slide. O autoplay pausa fora da tela; se quiser altura fixa, criar versões padronizadas ou artes mobile dedicadas (o Pan fica com ~102 px em 390 px).
2. Preencher hodômetro e cidade reais dos veículos, se disponíveis.
3. Substituir as descrições/observações geradas por textos oficiais dos lotes.
4. Revisar layout mobile das galerias com muitas fotos (até 25 miniaturas).
5. Se desejar, dinamizar os eventos estáticos de `index.html`/`leiloes.html` a partir de `NL_LOTS` (hoje são HTML fixo).
6. Dados antigos no localStorage (`nl_bids`, `nl_custom_lots`, `nl_lot_photos`, `nl_users`, `nl_session`, `nl_admin_session`) não são mais lidos; podem ser apagados do navegador sem efeito no site.

---

## 10. Comandos úteis

```powershell
# Servir localmente (na raiz do projeto)
python -m http.server 8000 --bind 127.0.0.1

# Validar sintaxe
node --check js/data.js
node --check js/lote.js
node --check js/lots-data.js

# Conferir catálogo
node -e "const fs=require('fs'),vm=require('vm');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/lots-data.js','utf8'),c);console.log(c.window.NL_REAL_LOTS.length)"

# Verificar fotos ausentes
node -e "const fs=require('fs'),vm=require('vm'),path=require('path');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/lots-data.js','utf8'),c);let n=0;c.window.NL_REAL_LOTS.forEach(l=>l.photos.forEach(p=>{if(!fs.existsSync(path.join(process.cwd(),p)))n++}));console.log('ausentes:',n)"

# Testar o upload sem enviar / enviar um lote / enviar tudo
node scripts/upload-images-supabase.js --dry-run
node scripts/upload-images-supabase.js --only=1006
node scripts/upload-images-supabase.js

# Importar/atualizar lotes e fotos no banco (precisa de js/lots-photos.json)
node scripts/import-lotes-supabase.js --dry-run
node scripts/import-lotes-supabase.js
```

Abrir: `http://127.0.0.1:8000/`

---

## 11. Histórico de tarefas

- **26/10/2026** — Preparação para Vercel (`DEPLOY-VERCEL.md`, `vercel.json`, `.vercelignore`, menu com `cleanUrls`); cadastro sem confirmação de e-mail, com CPF/telefone/endereço; painel com Clientes (busca/CSV) e Gerar contrato; migração `supabase/002_clientes_admin.sql` criada (pendente de execução); `js/contract.js` compartilhado; pedido de lances automáticos da casa recusado (shill bidding); cache busting em `?v=37`.
- **26/10/2026** — Supabase conectado: credenciais movidas do `.env.example` para `.env`; upload das 1.985 fotos (`--only=1006` conferido antes); `scripts/import-lotes-supabase.js` importou 8 leilões, 225 lotes `published` e 1.985 fotos; `js/supabase.js` novo; `auth.js`, `store.js` e `admin.js` reescritos sobre supabase-js 2.45.4; lances via `place_bid`, histórico via `lot_bid_history`, realtime no detalhe; "Lance automático" do admin removido; `.vercelignore` criado; testes de RLS, `place_bid` e fluxo pela interface feitos com usuário temporário (removido depois); cache busting em `?v=37`.
- **26/10/2026** — Home: "Aberto para lance" em vermelho (#e11d2a, mesmo tom do selo "Ao vivo"), apenas na seção `#leiloes`; cache busting em `?v=37`.
- **26/10/2026** — Selo "Bancos e Financeiras" estendido à página do lote e às datas de "Próximos leilões" (função compartilhada `NLSponsorBadge` em `site.js`; classes renomeadas de `.lot__sponsor*` para `.sponsor*`); selos "Leilão Seguro" e "SSL" acima do rodapé e no rodapé; cache busting em `?v=37`.
- **26/10/2026** — Banners passam automaticamente sem pausas por interação/visibilidade; adicionado selo de patrocinadores (6 logos em `images/patrocinadores/`) deslizando em loop ao lado do título de cada card de lote (`js/card.js` + `css/styles.css`); cache busting em `?v=37`.
- **26/10/2026** — Banners recompostos no formato do Bradesco: RIZA e Daycoval (desktop 1140×297 + mobile 780×747) e Pan mobile (780×747) gerados por `scripts/recompose-banners.py`; removido o fundo desfocado (`.banner--fill`/`.banner__bg`); cache busting em `?v=37`.
- **26/10/2026** — Banners padronizados pela dimensão do 1º (Bradesco) em desktop e mobile, com arte inteira sobre fundo desfocado nos slides de outra proporção; os 3 cards de campanha saíram do bloco único acima do rodapé: veículos após "Próximos leilões", motos após "Leilões em destaque" e só pesados acima do rodapé; cache busting em `?v=37`.
- **26/10/2026** — Banners da home reorganizados: o slider superior passou a ter 4 artes (Bradesco, Banco Pan, RIZA e Daycoval) e os antigos banners de texto viraram cards na seção `.promos` acima do rodapé; corrigida a proporção do Bradesco mobile (`780/747`), ajustado o contraste dos títulos e o autoplay agora pausa fora da tela/hover/toque/aba oculta; validado em 320–1440 px; cache busting em `?v=37`.
- **26/10/2026** — Header mobile fixo no topo ao rolar: `#site-header` sticky em ≤560 px, `.header` relativo dentro dele, troca de `overflow-x:hidden` por `overflow-x:clip` no html/body (o hidden quebrava o sticky) e `scroll-margin-top:72px` em `#localizar`/`#contract-output`; validado em 390/360/320 px; cache busting em `?v=29`.
- **26/10/2026** — Header: botão de conta agora é quadrado (cantos retos, `border-radius:0`) e centralizado exatamente entre a logo e o hambúrguer no mobile, mantendo o rótulo "Entre ou cadastre-se", a logo maior e a compactação por largura; validado em 320–560 px com gaps iguais e sem overflow; cache busting em `?v=28`.
- **26/10/2026** — Header: botão de conta passou a exibir "Entre ou cadastre-se" (desktop e mobile), pill menor e centralizada ao lado da logo, logo maior (46/42/40 px) e ajustes de fonte/espaçamento em ≤560/≤400/≤360 px; validado de 320 a 1440 px sem overflow; cache busting em `?v=27`.
- **26/10/2026** — Banner grande no mobile: criada arte dedicada `images/banner-mobile.webp` (780×747) e `<picture>` em ≤560 px; em 390 px o banner passou de ~102 px para ~374 px de altura; cache busting em `?v=26`.
- **26/10/2026** — Header mobile: botão "Entrar"/"Minha conta" movido para o lado da logo (grid `auto 1fr auto`), hambúrguer à direita; pill compacta e validação em 320–560 px sem overflow; cache busting em `?v=25`.
- **26/10/2026** — Banner responsivo em 360–1440 px: altura do viewport sincronizada ao slide ativo, controles em barra abaixo da imagem, promo sem faixas brancas e mobile compacto; cache busting em `?v=24`.
- **25/10/2026** — Script `scripts/upload-images-supabase.js` criado (API REST do Storage, secret key/service_role, retry, concorrência, `--dry-run`, `--only`, mapa de URLs públicas); `.env.example`, `.gitignore` e `scripts/package.json` adicionados; validação por dry-run e mock local (1.985 fotos/225 lotes/112,9 MB). Upload real pendente de schema + chaves.
- **25/10/2026** — Header reorganizado: logo à esquerda, navegação antes do login, botão "Entrar" azul sólido no canto direito (pill branca "Minha conta" quando logado), compactação em 981–1200px e botão full-width no mobile; cache busting em `?v=23`.
- **25/10/2026** — Container em 1320 px no desktop e correção de overflow no mobile; campo "Valor do lance" abaixo do botão verde (com +/−, formatação em reais e validação do mínimo); logo do rodapé visível sobre placa branca; remoção de todas as menções a demo/demonstração/fictício; `supabase/schema.sql` criado; cache busting em `?v=22`.
- **25/10/2026** — Galeria do lote em 4:3 com `contain` (fim do corte inferior); cards com `contain` e fundo de transição cinza; card "Entre ou cadastre-se" no header mobile; rodapé apenas com a logo; selo "Ao vivo" pulsante; banners com avanço automático; ficha do edital no detalhe do lote e novos campos em `edital.html`; cache busting em `?v=20`.
- **25/10/2026** — Botão "Dar lance" (`.btn--bid`) alterado para verde oficial (#25D366, hover #1EBE5D), inclusive o pulso (`bidPulse`); demais botões e estilos inalterados; cache busting elevado para `?v=14` em todas as páginas.
- **25/10/2026** — Bordas dos botões padronizadas como quadradas (CTAs, banners e controles dos carrosséis); apenas o botão "Dar lance" (`.btn--bid`) permanece arredondado; cache busting elevado para `?v=13` em todas as páginas.
- **25/10/2026** — Rotação automática das fotos nos cards (fade, stagger, pausa no hover e funcionamento mesmo com redução de movimento); botões/links restantes sem "Ver lotes" ("Ver itens do leilão", "Ver veículos", "Ver todos os itens"); WhatsApp confirmado em #25D366; cache busting elevado para `?v=12` em todas as páginas.
- **25/10/2026** — Botões dos cards agora exibem o rótulo da categoria ("Ver veículo", "Ver moto", "Ver embarcação", "Ver imóvel", "Ver equipamento") em vez de "Ver lote"; WhatsApp flutuante restaurado ao verde oficial (#25D366); cache busting elevado para `?v=11` em todas as páginas.
- **25/10/2026** — Importação do catálogo “Leilão” (225 lotes/1.985 fotos), integração de imagens, galerias, descrições, novas categorias (Imóveis/Equipamentos), filtros e agenda; validação por Chrome headless. Servidor local em `http://127.0.0.1:8000/`.

> Ao concluir uma nova tarefa, acrescente uma linha aqui e atualize as seções afetadas.
