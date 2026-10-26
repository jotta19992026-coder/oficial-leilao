// Leilão Oficial — cliente Supabase compartilhado (carregado depois do supabase-js do CDN).
// Só a chave PUBLISHABLE pode ficar aqui: ela é pública por definição e o acesso é limitado
// pelas políticas RLS do supabase/schema.sql. Nunca coloque a secret key/service_role no navegador.
(function () {
  'use strict';

  var URL = 'https://srxtmyhcfncscjvyibhg.supabase.co';
  var KEY = 'sb_publishable_9R2eZ6SgqUIEG70dcgeRYA_DonqNZS6';
  var REF = URL.replace(/^https:\/\//, '').split('.')[0];

  window.NL_SUPABASE = {
    url: URL,
    // Chave em que o supabase-js guarda a sessão; lida de forma síncrona pelo auth.js
    // para o cabeçalho já nascer com "Minha conta" sem esperar a rede.
    storageKey: 'sb-' + REF + '-auth-token'
  };

  if (!window.supabase || !window.supabase.createClient) {
    console.error('supabase-js não carregou; o site vai usar o catálogo local.');
    window.NLSupa = null;
    return;
  }

  window.NLSupa = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
