# AGENTS.md

## Antes de começar

Leia `CONTEXTO-IA.md` (estado atual, decisões, mapa dos 225 lotes e pendências). **Ao final de cada tarefa, salve todas as alterações e atualize esse arquivo** (seção "0. Onde paramos", "Histórico de tarefas" + seções afetadas) para que outra IA consiga continuar.

## Comandos

```powershell
# Servir o site localmente (na raiz) — já aplica o rewrite /br -> home
python scripts/serve-local.py

# Alternativa simples (sem /br, que dá 404 neste modo)
python -m http.server 8000 --bind 127.0.0.1

# Reimportar catálogo da pasta Desktop\Leilão
node scripts/import-lotes.js

# Reorganizar o catálogo em eventos semanais de 45 lotes (10h–12h) no Supabase
node scripts/setup-eventos-semanais.js --dry-run
node scripts/setup-eventos-semanais.js

# Reduzir lances iniciais (padrão 60%) e sincronizar o fallback do catálogo com o banco
node scripts/reduzir-precos.js --dry-run
node scripts/reduzir-precos.js
node scripts/sync-catalogo-local.js --dry-run
node scripts/sync-catalogo-local.js

# Validar sintaxe
node --check js/data.js
node --check js/lote.js
node --check js/lots-data.js
```

## Regras do projeto

- `js/lots-data.js` é **gerado** por `scripts/import-lotes.js`; não editar manualmente (regenerar).
- Preços, hodômetro, cidade e descrições do catálogo importado são **placeholders** gerados; não apresentar como dados oficiais.
- Ao alterar JS/CSS referenciado nos HTML, subir a versão do cache busting (`?v=8` → `?v=9`) em todas as páginas.
- Site estático, sem build e sem backend; dados do admin ficam em localStorage.
