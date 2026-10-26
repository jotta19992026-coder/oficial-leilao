// Leilão Oficial — máscaras de digitação nos padrões oficiais.
// Uso: <input data-mask="cpf"> → 000.000.000-00 · <input data-mask="phone"> → (00) 00000-0000 ou (00) 0000-0000
(function () {
  'use strict';

  var MASKS = {
    cpf: function (d) {
      d = d.slice(0, 11);
      return d.replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    },
    phone: function (d) {
      // Número colado com o código do país (+55): descarta o 55 e fica com DDD + número.
      if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
      d = d.slice(0, 11);
      if (d.length <= 2) return d.length ? '(' + d : '';
      var ddd = '(' + d.slice(0, 2) + ') ', rest = d.slice(2);
      // Celular (9 dígitos) fica 00000-0000; fixo (8 dígitos) fica 0000-0000.
      if (rest.length > 8) return ddd + rest.slice(0, 5) + '-' + rest.slice(5);
      if (rest.length > 4) return ddd + rest.slice(0, 4) + '-' + rest.slice(4);
      return ddd + rest;
    }
  };
  var MAXLEN = { cpf: 14, phone: 15 };
  // O limite de caracteres vale para a digitação; colar "+55 (41) 9 9999-0000" (20) precisa caber antes da máscara.
  var PASTE_SLACK = 6;

  function apply(el) {
    var fn = MASKS[el.getAttribute('data-mask')];
    if (!fn) return;
    var before = el.value;
    var atEnd = el.selectionStart === before.length;
    // Quantos dígitos havia antes do cursor: o cursor volta para a mesma posição lógica.
    var digitsBeforeCaret = before.slice(0, el.selectionStart || 0).replace(/\D/g, '').length;
    var formatted = fn(before.replace(/\D/g, ''));
    if (formatted === before) return;
    el.value = formatted;
    if (atEnd || document.activeElement !== el) return;
    var pos = 0, seen = 0;
    while (pos < formatted.length && seen < digitsBeforeCaret) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    while (pos < formatted.length && seen > 0 && /\D/.test(formatted[pos])) pos++; // pula o separador seguinte
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  }

  function setup(root) {
    (root || document).querySelectorAll('input[data-mask]').forEach(function (el) {
      if (el._nlMask) return;
      el._nlMask = true;
      var max = MAXLEN[el.getAttribute('data-mask')];
      if (max) el.setAttribute('maxlength', String(max + PASTE_SLACK));
      el.addEventListener('input', function () { apply(el); });
      apply(el); // valores preenchidos automaticamente (perfil/autocompletar)
    });
  }

  window.NLMasks = { setup: setup, apply: apply, format: function (type, value) {
    var fn = MASKS[type];
    return fn ? fn(String(value || '').replace(/\D/g, '')) : value;
  } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setup(); });
  else setup();
})();
