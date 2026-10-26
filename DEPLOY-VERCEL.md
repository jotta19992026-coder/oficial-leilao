# Publicar o site na Vercel com domínio próprio

O site é estático (HTML/CSS/JS, sem build). Os dados, logins, lances e fotos ficam no Supabase. Na Vercel **não é preciso nenhuma variável de ambiente**: o navegador usa só a chave *publishable*, que já está em `js/supabase.js`. A secret key fica apenas no `.env` do seu computador, e o `.vercelignore` impede que ela seja publicada.

---

## 1. Supabase (fazer uma vez, antes de publicar)

### 1.1 Rodar a migração dos clientes
1. Abra o projeto no Supabase → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/002_clientes_admin.sql` e clique em **Run**.
   - Adiciona CPF, telefone e endereço ao perfil do cliente, cria as funções do painel (`admin_clients`, `admin_client_lots`) e confirma contas que tenham ficado pendentes.

### 1.2 Desligar a confirmação de e-mail
1. **Authentication → Sign In / Providers → Email**.
2. Desmarque **Confirm email** e clique em **Save**.
   - A partir daí o cliente se cadastra e já entra logado. Os dados ficam só no seu banco (tabela `profiles` + Authentication → Users).

### 1.3 Criar o login de administrador
1. **Authentication → Users → Add user → Create new user**.
2. Informe seu e-mail e uma senha forte e marque **Auto Confirm User**. Clique em **Create user**.
3. No **SQL Editor**, rode (trocando o e-mail):
   ```sql
   update public.profiles set role = 'admin' where email = 'seu-email@dominio.com.br';
   select email, role from public.profiles where role = 'admin';
   ```
   A segunda linha deve mostrar o seu e-mail com `admin`.
4. Entre em `/admin-login` com esse e-mail e senha.

> Alternativa: cadastre-se pela página **Cadastrar** do site e depois rode o mesmo `update`.
> Para remover um admin: `update public.profiles set role = 'user' where email = '...';`

---

## 2. Publicar na Vercel

### Opção A — pelo GitHub (recomendado: cada `git push` publica sozinho)
1. Crie um repositório **privado** no GitHub e envie a pasta do projeto. O `.gitignore` já deixa o `.env` de fora; confira que ele **não** subiu.
2. Em <https://vercel.com/new>, clique em **Import** no repositório.
3. Configure:
   - **Framework Preset:** `Other`
   - **Build Command:** deixe vazio
   - **Output Directory:** deixe vazio (a raiz do projeto)
   - **Environment Variables:** nenhuma
4. Clique em **Deploy**. Ao terminar, você recebe um endereço `https://<projeto>.vercel.app`.

### Opção B — pela linha de comando
```powershell
npm i -g vercel
vercel login
vercel          # na raiz do projeto: crie o projeto e aceite os padrões (Other, sem build)
vercel --prod   # publica em produção
```

O que **não** é publicado (veja `.vercelignore`): `.env`, `scripts/`, `supabase/`, `images/lotes/` (as fotos já estão no Supabase Storage), `js/lots-photos.json` e os arquivos `.md`.

---

## 3. Conectar o domínio

1. Na Vercel: **Project → Settings → Domains → Add**. Adicione `seudominio.com.br` e também `www.seudominio.com.br` (marque para redirecionar um para o outro).
2. No painel do registro do domínio (ex.: Registro.br → **DNS → Editar zona**), crie os registros que a Vercel mostrar. Normalmente são:

   | Tipo  | Nome  | Valor                  |
   |-------|-------|------------------------|
   | A     | `@`   | `76.76.21.21`          |
   | CNAME | `www` | `cname.vercel-dns.com` |

   Se a tela da Vercel indicar valores diferentes, use os da Vercel.
   - Outra opção: trocar os servidores DNS do domínio para `ns1.vercel-dns.com` e `ns2.vercel-dns.com` (a Vercel passa a gerenciar o DNS).
3. Aguarde a propagação (de minutos a algumas horas). O certificado HTTPS é emitido automaticamente.

---

## 4. Avisar o Supabase sobre o novo endereço

**Authentication → URL Configuration**:
- **Site URL:** `https://seudominio.com.br`
- **Redirect URLs** (adicione todos):
  - `https://seudominio.com.br/**`
  - `https://www.seudominio.com.br/**`
  - `https://<projeto>.vercel.app/**`
  - `http://127.0.0.1:8000/**` (para continuar testando no computador)

---

## 4.1. Recuperação de senha ("Esqueci minha senha")

O site já está programado: `login` e `admin-login` têm o link **Esqueci minha senha** (`js/recover.js` → `NLAuth.requestPasswordReset`, que chama `supabase.auth.resetPasswordForEmail`) e o e-mail leva a `redefinir-senha`, que grava a nova senha (`NLAuth.updatePassword` → `supabase.auth.updateUser`). Falta configurar o Supabase:

1. **Redirect URLs** (seção 4 acima): o link do e-mail só volta para o site se o endereço estiver na lista. Sem isso o Supabase manda a pessoa para o **Site URL**.
2. **SMTP próprio (obrigatório em produção):** o e-mail embutido do Supabase só entrega para os membros da equipe do projeto e tem limite de poucos e-mails por hora. Em **Authentication → Emails → SMTP Settings**, ative *Custom SMTP* com um provedor (Resend, Brevo, Amazon SES, Zoho…), usando um remetente do seu domínio (ex.: `nao-responda@seudominio.com.br`) e os registros **SPF/DKIM** que o provedor indicar no DNS — sem isso os e-mails caem no spam.
3. **Modelo do e-mail:** em **Authentication → Emails → Templates → Reset Password**, troque para português. Exemplo:
   - Assunto: `Redefinição de senha`
   - Corpo:
     ```html
     <h2>Redefinir sua senha</h2>
     <p>Recebemos um pedido para criar uma nova senha para a sua conta.</p>
     <p><a href="{{ .ConfirmationURL }}">Criar nova senha</a></p>
     <p>O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha atual continua valendo.</p>
     ```
   Mantenha `{{ .ConfirmationURL }}`: é ele que leva o token até `redefinir-senha`.
4. **Limites e segurança (Authentication → Rate Limits / Providers → Email):** mantenha o limite de e-mails por hora, o prazo do link (*Email OTP Expiration*, 3600 s) e, se quiser senhas mais fortes, aumente *Minimum password length* para 8 **e** troque o `6` por `8` em `signup` e `updatePassword` no `js/auth.js` (as duas regras precisam ser iguais).

Boas práticas já aplicadas no código: a resposta ao pedido é sempre a mesma, exista ou não a conta (não revela e-mails cadastrados); o token chega no `#hash` da URL e é lido pelo supabase-js (`detectSessionInUrl`), nunca vai para o servidor nem para o contador de visitas; link expirado ou já usado mostra a mensagem com o caminho para pedir outro; `redefinir-senha` tem `noindex` e `no-store` (`vercel.json`).

---

## 5. Conferência depois de publicar

- [ ] A home abre e mostra os lotes com fotos.
- [ ] `/lote?id=401` mostra fotos, cronômetro e histórico.
- [ ] Cadastro com CPF/telefone entra direto (sem e-mail de confirmação).
- [ ] Um lance pelo site aparece no histórico e no painel admin.
- [ ] `/admin-login` com a conta admin abre o painel; aparecem **Clientes cadastrados** e **Gerar contrato**.
- [ ] Uma conta comum **não** entra no painel.
- [ ] **Esqueci minha senha** com o seu e-mail: o e-mail chega, o link abre `/redefinir-senha` e a nova senha funciona no login.

### Atualizar o site depois
- Opção A: faça as alterações, `git commit` e `git push`.
- Opção B: `vercel --prod`.
- Ao mudar CSS/JS, suba a versão `?v=N` em todos os HTML. Os arquivos de `css/` e `js/` ficam em cache por 1 ano, e é a versão que força a atualização.
