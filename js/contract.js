// Leilão Oficial — modelo do contrato de arrematação (usado no painel admin).
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // DADOS DA EMPRESA E DO LEILOEIRO — preencha com os dados REAIS e registrados.
  // Campo vazio sai no contrato como linha em branco ("________") para preencher à mão.
  // logo: caminho de um arquivo da SUA empresa (ex.: 'images/logo-empresa.png'); vazio = cabeçalho só com o nome.
  // razaoSocial/CNPJ/leiloeiro/matrícula ainda em branco: sem eles o contrato não é válido para assinatura.
  // ------------------------------------------------------------------
  var EMPRESA = {
    razaoSocial: '',
    nomeFantasia: 'Leilão Oficial',
    cnpj: '',
    endereco: 'Estr. Muranaka, 199 - Jardim Novo Horizonte, Itaquaquecetuba - SP, 08597-230',
    telefone: '',
    email: '',
    site: '',
    logo: 'images/logo.webp',
    leiloeiro: '',          // nome do leiloeiro oficial
    leiloeiroCpf: '',
    matricula: '',          // nº de matrícula na Junta Comercial
    junta: '',              // ex.: 'JUCEPAR — Junta Comercial do Paraná'
    comissao: 5,            // % sobre o valor de arremate (art. 24 do Decreto 21.981/1932)
    prazoPagamentoDias: 2,  // dias úteis após o encerramento
    prazoRetiradaDias: 10,  // dias úteis após a liberação
    taxaArmazenagem: '',    // ex.: 'R$ 50,00 por dia'
    multaInadimplencia: 20, // % sobre o valor de arremate
    foro: ''                // comarca
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }
  function brl(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // Valor preenchido ou linha para preencher à mão.
  function f(v, size) { return v ? esc(v) : '<span class="ct-blank" style="min-width:' + (size || 12) + 'em"></span>'; }
  function clause(n, title, paragraphs) {
    return '<section class="ct-clause"><h3>Cláusula ' + n + ' — ' + title + '</h3>' +
      paragraphs.map(function (p, i) { return '<p><strong>' + n + '.' + (i + 1) + '.</strong> ' + p + '</p>'; }).join('') + '</section>';
  }

  var CSS =
    '.ct{font-family:Georgia,"Times New Roman",serif;color:#1b1f24;font-size:11.5pt;line-height:1.55;max-width:820px;margin:0 auto;background:#fff}' +
    '.ct p{margin:0 0 .55em;text-align:justify;hyphens:auto}' +
    '.ct h2{font-size:15pt;text-align:center;text-transform:uppercase;letter-spacing:.04em;margin:.4em 0 .2em}' +
    '.ct h3{font-size:11.5pt;text-transform:uppercase;margin:1.1em 0 .4em;break-after:avoid}' +
    '.ct-clause{break-inside:auto}' +
    '.ct-head{display:flex;align-items:center;justify-content:space-between;gap:1.5em;border-bottom:2px solid #1b1f24;padding-bottom:.7em;margin-bottom:1em}' +
    '.ct-head img{max-height:64px;max-width:220px;object-fit:contain}' +
    '.ct-head__co{font-size:9.5pt;line-height:1.35;text-align:right;color:#333}' +
    '.ct-head__co strong{font-size:11pt}' +
    '.ct-sub{text-align:center;font-size:10pt;color:#444;margin:0 0 1.2em}' +
    '.ct-blank{display:inline-block;border-bottom:1px solid #333;height:1em;vertical-align:baseline}' +
    '.ct-box{border:1px solid #333;padding:.7em .9em;margin:.8em 0 1em}' +
    '.ct-box p{margin:.2em 0}' +
    '.ct table{width:100%;border-collapse:collapse;margin:.6em 0 1em;font-size:10.5pt}' +
    '.ct td,.ct th{border:1px solid #333;padding:.4em .6em;text-align:left;vertical-align:top}' +
    '.ct th{background:#f1f1f1;width:38%}' +
    '.ct-alert{border:2px solid #1b1f24;padding:.7em .9em;margin:.6em 0 1em;background:#fafafa}' +
    '.ct-sign{display:grid;grid-template-columns:1fr 1fr;gap:2.2em 2.5em;margin-top:2.4em;break-inside:avoid}' +
    '.ct-sign div{border-top:1px solid #1b1f24;padding-top:.35em;text-align:center;font-size:10pt}' +
    '.ct-annex{break-before:page}' +
    '.ct-foot{font-size:9pt;color:#555;text-align:center;margin-top:1.6em}' +
    '@media print{.ct{max-width:none}.no-print{display:none!important}}';

  // d: { nome, cpf, email, tel, endereco, lote, valor (número), data, numero?, comitente? }
  window.NLContractHTML = function (d) {
    var E = EMPRESA;
    var valor = Number(d.valor) || 0;
    var comissao = valor * (Number(E.comissao) || 0) / 100;
    var hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    var empresaNome = E.razaoSocial || E.nomeFantasia;
    var leiloeiroTxt = f(E.leiloeiro, 16) + ', leiloeiro(a) oficial, inscrito(a) no CPF sob o nº ' + f(E.leiloeiroCpf, 9) +
      ', matriculado(a) na ' + f(E.junta, 16) + ' sob o nº ' + f(E.matricula, 8);
    var empresaTxt = f(empresaNome, 16) + ', inscrita no CNPJ sob o nº ' + f(E.cnpj, 10) + ', com sede em ' + f(E.endereco, 22);

    var head = '<header class="ct-head">' +
      (E.logo ? '<img src="' + esc(E.logo) + '" alt="' + esc(empresaNome || 'Logo da empresa') + '">' : '<div><strong>' + f(empresaNome, 14) + '</strong></div>') +
      '<div class="ct-head__co"><strong>' + f(empresaNome, 14) + '</strong><br>CNPJ ' + f(E.cnpj, 10) + '<br>' + f(E.endereco, 18) +
      (E.telefone || E.email ? '<br>' + esc([E.telefone, E.email].filter(Boolean).join(' · ')) : '') + '</div></header>';

    var parts = [
      clause(1, 'Do objeto', [
        'O presente contrato tem por objeto a formalização da arrematação, pelo ARREMATANTE, do bem descrito no Quadro-Resumo (Anexo I) e identificado como: <strong>' + esc(d.lote || '—') + '</strong>, levado a leilão na modalidade eletrônica, com encerramento em ' + esc(d.data || '—') + '.',
        'A descrição do bem, suas fotos, condições, débitos conhecidos e demais informações constam do edital e da página do lote, que integram este contrato para todos os fins.',
        'O bem é vendido <em>ad corpus</em>, no estado de conservação e funcionamento em que se encontra, sem que caiba ao ARREMATANTE reclamar diferenças de qualquer natureza após a arrematação, ressalvado o disposto em lei.'
      ]),
      clause(2, 'Da legislação aplicável', [
        'O leilão e este contrato regem-se pelo Decreto nº 21.981/1932 (profissão de leiloeiro), pela Instrução Normativa DREI nº 72/2019, pelo Código Civil (Lei nº 10.406/2002), pelo Código de Trânsito Brasileiro (Lei nº 9.503/1997), quando se tratar de veículo, pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e, nas relações de consumo, pelo Código de Defesa do Consumidor (Lei nº 8.078/1990).',
        'Prevalecem, em caso de conflito, as disposições legais de ordem pública sobre as cláusulas deste instrumento e do edital.'
      ]),
      clause(3, 'Dos documentos integrantes', [
        'Integram este contrato, como se nele estivessem transcritos: (a) o edital do leilão; (b) as condições gerais de venda publicadas na plataforma; (c) a página de descrição do lote, com fotos e observações; (d) o registro eletrônico dos lances; e (e) o Quadro-Resumo (Anexo I).',
        'O ARREMATANTE declara ter lido e compreendido todos esses documentos antes de oferecer o lance, tendo tido oportunidade de esclarecer dúvidas pelos canais oficiais de atendimento.'
      ]),
      clause(4, 'Da vistoria e do estado do bem', [
        'Foi facultada ao ARREMATANTE a visitação e a vistoria prévia do bem, nas datas, horários e locais divulgados no edital. A não realização da vistoria não lhe dá direito a reclamação posterior sobre o estado do bem.',
        'As fotos e descrições têm caráter ilustrativo e foram elaboradas com base nas informações fornecidas pelo COMITENTE, não constituindo laudo técnico. Quilometragem, ano, modelo, opcionais e condições mecânicas, elétricas e estruturais devem ser conferidos pelo próprio ARREMATANTE.',
        'Eventuais avarias, ausência de peças, chaves, manuais, estepe, equipamentos obrigatórios ou acessórios não ensejam desconto, abatimento ou desfazimento da arrematação, salvo se expressamente garantidos no edital.'
      ]),
      clause(5, 'Do preço de arrematação', [
        'O preço de arrematação é de <strong>' + brl(valor) + '</strong>, correspondente ao maior lance válido registrado na plataforma ao término do pregão do lote.',
        'O preço não inclui a comissão do leiloeiro, as despesas e os encargos previstos nas Cláusulas 6 e 7, que são devidos pelo ARREMATANTE em acréscimo.'
      ]),
      clause(6, 'Da comissão do leiloeiro', [
        'Sobre o preço de arrematação incide a comissão do leiloeiro oficial de <strong>' + esc(E.comissao) + '% (' + brl(comissao) + ')</strong>, nos termos do art. 24, parágrafo único, do Decreto nº 21.981/1932, devida exclusivamente pelo ARREMATANTE.',
        'A comissão não será devolvida em caso de desistência ou inadimplemento do ARREMATANTE, sendo restituída apenas se a arrematação for desfeita por causa não imputável a ele.'
      ]),
      clause(7, 'Das despesas e encargos', [
        'Correm por conta do ARREMATANTE, quando previstos no edital: taxas administrativas, despesas de remoção, transporte, estadia em pátio após o prazo de retirada, vistorias, emissão de documentos, transferência de propriedade, tributos de transmissão (como o ITBI, no caso de imóveis) e emolumentos cartorários.',
        'Débitos anteriores à data do leilão, como IPVA, licenciamento, multas e taxas condominiais, seguem a regra expressa no edital de cada lote. Na falta de previsão, os débitos tributários e as multas vinculadas ao bem até a data da arrematação são de responsabilidade do COMITENTE.'
      ]),
      clause(8, 'Da forma e do prazo de pagamento', [
        'O pagamento do preço, da comissão e dos encargos deverá ser feito integralmente em até <strong>' + esc(E.prazoPagamentoDias) + ' (' + esc(E.prazoPagamentoDias) + ') dia(s) útil(eis)</strong> após o encerramento do lote, salvo condição diversa prevista no edital.',
        'O pagamento será feito <strong>exclusivamente</strong> por boleto ou transferência para conta bancária de titularidade do LEILOEIRO OFICIAL ou do COMITENTE, com os dados informados no edital e na área do cliente. <strong>Nenhum pagamento deve ser feito a pessoa física diversa ou a empresa estranha a este contrato.</strong>',
        'O ARREMATANTE deve conferir, antes de pagar, se o beneficiário do boleto ou da transferência corresponde ao LEILOEIRO ou ao COMITENTE identificados neste contrato. Pagamentos a terceiros não quitam a obrigação.',
        'Em caso de parcelamento ou financiamento admitido no edital, as condições específicas constarão de instrumento próprio, que passará a integrar este contrato.'
      ]),
      clause(9, 'Da inadimplência', [
        'O não pagamento no prazo implica o desfazimento da arrematação, independentemente de notificação, com a cobrança de multa de <strong>' + esc(E.multaInadimplencia) + '%</strong> sobre o preço de arrematação, além da comissão do leiloeiro, a título de cláusula penal.',
        'O ARREMATANTE inadimplente poderá ter seu cadastro suspenso na plataforma e responder pelas perdas e danos excedentes, inclusive a diferença de preço apurada em nova venda do bem.',
        'O atraso, quando admitido pelo LEILOEIRO, sujeitará o valor devido a juros de mora de 1% ao mês e correção monetária pelo IPCA, calculados pro rata die.'
      ]),
      clause(10, 'Da irretratabilidade do lance', [
        'O lance é irrevogável e irretratável. Ao ofertá-lo, o ARREMATANTE assume a obrigação de pagar o preço e os encargos caso seja o vencedor.',
        'Ficam ressalvadas as hipóteses de arrependimento e de desfazimento expressamente previstas em lei, que serão analisadas caso a caso e respondidas por escrito pelo LEILOEIRO.'
      ]),
      clause(11, 'Da documentação e da transferência', [
        'Confirmado o pagamento integral, o LEILOEIRO entregará ao ARREMATANTE a nota de venda em leilão e, conforme o caso, os documentos necessários à transferência de propriedade, no prazo previsto no edital.',
        'Em se tratando de veículo, o ARREMATANTE deverá providenciar a transferência no órgão de trânsito no prazo de 30 (trinta) dias, nos termos do art. 123, § 1º, do Código de Trânsito Brasileiro, respondendo pelas multas e pontuações decorrentes da não transferência.',
        'Veículos classificados como recuperáveis de sinistro, com restrição, remarcação de chassi, sucata ou similares terão essa condição informada na página do lote e poderão exigir vistoria especial, cujas despesas correm por conta do ARREMATANTE.',
        'Em se tratando de imóvel, a transferência dar-se-á por escritura pública ou instrumento equivalente, cabendo ao ARREMATANTE as providências de registro na matrícula do imóvel, observado o edital.'
      ]),
      clause(12, 'Dos débitos, ônus e restrições', [
        'Os ônus, gravames, ações judiciais, débitos e restrições conhecidos foram informados no edital e na página do lote. O ARREMATANTE declara ter consultado essas informações antes do lance.',
        'Restrições desconhecidas e não informadas que impeçam a transferência do bem autorizam o desfazimento da arrematação com a devolução integral dos valores pagos, nos termos da Cláusula 17.'
      ]),
      clause(13, 'Da retirada e da entrega do bem', [
        'A retirada do bem será agendada pelos canais oficiais após a confirmação do pagamento e ocorrerá no local indicado no edital, em até <strong>' + esc(E.prazoRetiradaDias) + ' (' + esc(E.prazoRetiradaDias) + ') dia(s) útil(eis)</strong> contados da liberação.',
        'No ato da retirada, o ARREMATANTE, ou procurador com poderes específicos e firma reconhecida, apresentará documento oficial com foto e a nota de venda, assinando o termo de entrega.',
        'A remoção, o transporte, o guincho e eventuais desmontagens correm por conta e risco do ARREMATANTE, que deverá observar as normas de segurança do pátio.'
      ]),
      clause(14, 'Da guarda e da armazenagem', [
        'Decorrido o prazo de retirada, será cobrada taxa de armazenagem de ' + f(E.taxaArmazenagem, 10) + ', conforme o edital, até a efetiva retirada.',
        'Não retirado o bem em 30 (trinta) dias após o fim do prazo, o ARREMATANTE será notificado e, persistindo a inércia, o bem poderá ser considerado abandonado, nos limites da lei, deduzindo-se do valor a restituir as despesas de guarda.'
      ]),
      clause(15, 'Da transferência dos riscos', [
        'Os riscos de perecimento, deterioração, furto ou dano do bem transferem-se ao ARREMATANTE a partir da assinatura do termo de entrega ou do fim do prazo de retirada, o que ocorrer primeiro.',
        'Até a entrega, o depositário do bem responde por sua guarda nos termos da lei.'
      ]),
      clause(16, 'Das garantias e dos vícios', [
        'Salvo previsão expressa em contrário, o bem não possui garantia contratual de funcionamento, motor, câmbio, estrutura ou quaisquer componentes.',
        'Permanecem assegurados ao ARREMATANTE os direitos previstos em lei quanto a vícios ocultos que tornem o bem impróprio ao uso ou lhe diminuam o valor, observados os prazos legais e as características próprias da venda em leilão.'
      ]),
      clause(17, 'Do cancelamento e da evicção', [
        'O COMITENTE e o LEILOEIRO podem suspender ou cancelar o leilão ou lotes específicos antes do encerramento, sem ônus para os participantes.',
        'Se, após a arrematação, a venda for desfeita por causa não imputável ao ARREMATANTE (inclusive evicção, ordem judicial ou restrição não informada), serão devolvidos integralmente o preço, a comissão e as despesas pagas, corrigidos pelo IPCA, em até 15 (quinze) dias úteis, mediante depósito na conta de titularidade do ARREMATANTE.'
      ]),
      clause(18, 'Das obrigações do leiloeiro', [
        'Compete ao LEILOEIRO: (a) conduzir o leilão com publicidade, transparência e isonomia; (b) manter registro íntegro e auditável dos lances; (c) prestar informações verdadeiras e completas sobre os lotes; (d) emitir a nota de venda e prestar contas ao COMITENTE e ao ARREMATANTE; e (e) receber os valores somente em contas de sua titularidade ou do COMITENTE.',
        'É vedado ao LEILOEIRO, ao COMITENTE e a pessoas a eles ligadas ofertar lances para elevar artificialmente o preço dos lotes.'
      ]),
      clause(19, 'Das obrigações do arrematante', [
        'Compete ao ARREMATANTE: (a) manter seus dados cadastrais verdadeiros e atualizados; (b) efetuar os pagamentos nos prazos e contas indicados; (c) retirar o bem no prazo; (d) providenciar a transferência e regularização do bem; e (e) zelar pelo sigilo de sua senha de acesso.',
        'Os lances realizados com o login e a senha do ARREMATANTE presumem-se feitos por ele, cabendo-lhe comunicar imediatamente qualquer uso indevido.'
      ]),
      clause(20, 'Da prevenção a fraudes', [
        'O ARREMATANTE reconhece que pode confirmar, a qualquer tempo, a regularidade do LEILOEIRO consultando a lista de leiloeiros oficiais publicada pela Junta Comercial competente, e a existência do COMITENTE e da empresa organizadora pelo CNPJ na Receita Federal.',
        'Comunicações sobre pagamento só são válidas se feitas pelos canais oficiais indicados neste contrato. Mensagens, telefonemas ou perfis que solicitem pagamento em conta diversa devem ser ignorados e comunicados ao LEILOEIRO e às autoridades.'
      ]),
      clause(21, 'Da proteção de dados pessoais', [
        'Os dados pessoais do ARREMATANTE serão tratados para a execução deste contrato, o cumprimento de obrigações legais e regulatórias (inclusive fiscais e de prevenção à lavagem de dinheiro) e o exercício regular de direitos, nos termos dos arts. 7º, II, V e VI, da Lei nº 13.709/2018.',
        'Os dados poderão ser compartilhados com o COMITENTE, órgãos de trânsito, cartórios, instituições financeiras e autoridades, na medida necessária a essas finalidades, e serão mantidos pelo prazo legal.',
        'O ARREMATANTE pode exercer os direitos previstos no art. 18 da LGPD (acesso, correção, informação sobre compartilhamento, entre outros) pelo e-mail ' + f(E.email, 12) + '.'
      ]),
      clause(22, 'Da prevenção à lavagem de dinheiro', [
        'Em atendimento à Lei nº 9.613/1998 e às normas aplicáveis, o LEILOEIRO poderá exigir documentos que comprovem a identidade do ARREMATANTE e a origem dos recursos, bem como comunicar operações às autoridades competentes.',
        'Não serão aceitos pagamentos em espécie acima dos limites legais nem pagamentos feitos por terceiros não identificados.'
      ]),
      clause(23, 'Das comunicações', [
        'As comunicações entre as partes serão feitas por escrito, preferencialmente pelo e-mail e telefone informados no cadastro do ARREMATANTE e pelos canais oficiais do LEILOEIRO indicados no cabeçalho deste contrato.',
        'Considera-se recebida a comunicação enviada ao e-mail cadastrado, cabendo ao ARREMATANTE mantê-lo atualizado.'
      ]),
      clause(24, 'Da cessão', [
        'O ARREMATANTE não poderá ceder ou transferir os direitos e obrigações deste contrato a terceiros sem a anuência prévia e escrita do LEILOEIRO e do COMITENTE.'
      ]),
      clause(25, 'Das disposições gerais', [
        'A tolerância de qualquer das partes quanto ao descumprimento de obrigação não importa novação, renúncia ou alteração do pactuado.',
        'A nulidade ou ineficácia de qualquer cláusula não prejudica as demais, que permanecem válidas.',
        'Este contrato obriga as partes e seus sucessores a qualquer título.'
      ]),
      clause(26, 'Da assinatura', [
        'As partes admitem a assinatura deste contrato por meio eletrônico, nos termos da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, reconhecendo-a como válida e eficaz, ou por assinatura física com firma reconhecida.',
        'O contrato é firmado em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas.'
      ]),
      clause(27, 'Do foro', [
        'Fica eleito o foro da comarca de ' + f(E.foro, 12) + ' para dirimir quaisquer controvérsias oriundas deste contrato, ressalvado ao ARREMATANTE consumidor o direito de propor a ação no foro de seu domicílio, nos termos do art. 101, I, do Código de Defesa do Consumidor.'
      ])
    ];

    return '<style>' + CSS + '</style><article class="ct contract-doc" id="contract-doc">' + head +
      '<h2>Contrato particular de compra e venda de bem arrematado em leilão</h2>' +
      '<p class="ct-sub">' + (d.numero ? 'Contrato nº ' + esc(d.numero) + ' · ' : '') + 'Leilão eletrônico · Emitido em ' + esc(hoje) + '</p>' +

      '<h3>Qualificação das partes</h3>' +
      '<div class="ct-box">' +
      '<p><strong>LEILOEIRO OFICIAL:</strong> ' + leiloeiroTxt + ', doravante denominado(a) <strong>LEILOEIRO</strong>.</p>' +
      '<p><strong>EMPRESA ORGANIZADORA:</strong> ' + empresaTxt + ', responsável pela plataforma eletrônica do leilão.</p>' +
      '<p><strong>COMITENTE (VENDEDOR):</strong> ' + f(d.comitente, 20) + ', proprietário(a) do bem, representado(a) pelo LEILOEIRO, doravante denominado(a) <strong>COMITENTE</strong>.</p>' +
      '<p><strong>ARREMATANTE (COMPRADOR):</strong> ' + f(d.nome, 16) + ', inscrito(a) no CPF/CNPJ sob o nº ' + f(d.cpf, 10) + ', residente e domiciliado(a) em ' + f(d.endereco, 22) +
      ', e-mail ' + f(d.email, 12) + ', telefone ' + f(d.tel, 9) + ', doravante denominado(a) <strong>ARREMATANTE</strong>.</p>' +
      '</div>' +

      '<p>As partes acima qualificadas, considerando que (i) o ARREMATANTE se cadastrou e habilitou na plataforma de leilões, aceitando suas condições gerais; (ii) participou do leilão eletrônico e ofertou o maior lance válido para o lote adiante descrito; e (iii) desejam formalizar os direitos e obrigações decorrentes da arrematação; têm entre si justo e contratado o presente instrumento, que se regerá pelas cláusulas e condições seguintes.</p>' +

      '<div class="ct-alert"><strong>Aviso de segurança ao arrematante:</strong> antes de pagar, confirme na Junta Comercial a matrícula do leiloeiro indicado acima e confira se o beneficiário do pagamento é o LEILOEIRO ou o COMITENTE deste contrato. Não faça pagamentos a pessoas ou empresas diferentes das aqui identificadas.</div>' +

      parts.join('') +

      '<p style="margin-top:1.4em">E, por estarem assim justas e contratadas, as partes assinam o presente instrumento.</p>' +
      '<p>' + f('', 14) + ', ' + esc(hoje) + '.</p>' +
      '<div class="ct-sign">' +
      '<div>' + (d.nome ? esc(d.nome) : '&nbsp;') + '<br>ARREMATANTE<br>CPF/CNPJ ' + f(d.cpf, 9) + '</div>' +
      '<div>' + (E.leiloeiro ? esc(E.leiloeiro) : '&nbsp;') + '<br>LEILOEIRO OFICIAL<br>Matrícula ' + f(E.matricula, 7) + '</div>' +
      '<div>Testemunha 1<br>Nome: ' + f('', 12) + '<br>CPF: ' + f('', 9) + '</div>' +
      '<div>Testemunha 2<br>Nome: ' + f('', 12) + '<br>CPF: ' + f('', 9) + '</div>' +
      '</div>' +

      '<section class="ct-annex">' + head +
      '<h2>Anexo I — Quadro-resumo da arrematação</h2>' +
      '<table>' +
      '<tr><th>Contrato nº</th><td>' + f(d.numero, 8) + '</td></tr>' +
      '<tr><th>Lote / bem</th><td>' + esc(d.lote || '—') + '</td></tr>' +
      '<tr><th>Encerramento do lote</th><td>' + esc(d.data || '—') + '</td></tr>' +
      '<tr><th>Comitente (vendedor)</th><td>' + f(d.comitente, 16) + '</td></tr>' +
      '<tr><th>Arrematante</th><td>' + f(d.nome, 14) + ' — CPF/CNPJ ' + f(d.cpf, 9) + '</td></tr>' +
      '<tr><th>Preço de arrematação</th><td>' + brl(valor) + '</td></tr>' +
      '<tr><th>Comissão do leiloeiro (' + esc(E.comissao) + '%)</th><td>' + brl(comissao) + '</td></tr>' +
      '<tr><th>Total (preço + comissão)</th><td><strong>' + brl(valor + comissao) + '</strong> + despesas previstas no edital</td></tr>' +
      '<tr><th>Prazo de pagamento</th><td>' + esc(E.prazoPagamentoDias) + ' dia(s) útil(eis) após o encerramento</td></tr>' +
      '<tr><th>Conta para pagamento</th><td>Somente conta de titularidade do LEILOEIRO ou do COMITENTE: banco ' + f('', 6) + ', agência ' + f('', 4) + ', conta ' + f('', 7) + ', titular ' + f('', 14) + '</td></tr>' +
      '<tr><th>Prazo de retirada</th><td>' + esc(E.prazoRetiradaDias) + ' dia(s) útil(eis) após a liberação</td></tr>' +
      '<tr><th>Local de retirada</th><td>' + f('', 22) + '</td></tr>' +
      '<tr><th>Multa por inadimplência</th><td>' + esc(E.multaInadimplencia) + '% sobre o preço de arrematação</td></tr>' +
      '</table>' +
      '<p>Declaro que conferi os dados acima e que recebi cópia do edital e das condições gerais do leilão.</p>' +
      '<div class="ct-sign"><div>' + (d.nome ? esc(d.nome) : '&nbsp;') + '<br>ARREMATANTE</div><div>' + (E.leiloeiro ? esc(E.leiloeiro) : '&nbsp;') + '<br>LEILOEIRO OFICIAL</div></div>' +
      '<p class="ct-foot">Confira todas as informações antes de assinar. Este documento só é válido com a identificação completa do leiloeiro oficial e do comitente.</p>' +
      '</section></article>';
  };

  // Abre o contrato numa janela própria (A4, numeração de páginas) e chama a impressão (salvar PDF).
  window.NLContractPrint = function (d) {
    var w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para gerar o contrato.'); return; }
    var base = location.href.replace(/[^/]*$/, '');
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato — ' + esc(d.nome || '') + '</title>' +
      '<base href="' + esc(base) + '">' +
      '<style>@page{size:A4;margin:20mm 18mm 22mm;@bottom-right{content:"Página " counter(page) " de " counter(pages);font:9pt Georgia,serif;color:#555}}' +
      'html,body{background:#fff;margin:0}body{padding:24px}@media print{body{padding:0}}</style></head><body>' +
      window.NLContractHTML(d) + '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>');
    w.document.close();
  };
})();
