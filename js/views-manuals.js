/* Manuais de utilização por perfil */
(function (N) {
  "use strict";
  var esc = N.esc;
  var activeManual = "voluntario";
  var manualRole = null;

  var manuals = {
    admin: {
      id: "admin",
      title: "Manual do Administrador",
      subtitle: "Cadastros, unidades, escalas, permissões, trocas, LGPD, histórico e funções administrativas",
      body: [
        "<h2>1. Visão geral</h2>",
        "<p>O Agentes do Amor AMI organiza voluntários, disponibilidades e escalas das unidades <b>AMI – Pacheco</b> e <b>AMI – Amendoeira</b>. O administrador tem acesso total às funcionalidades permitidas pela sua abrangência de unidade.</p>",
        "<div class='note'>O administrador da unidade Pacheco possui acesso completo às duas unidades. O administrador da Amendoeira (cesarigrejaami@gmail.com) administra exclusivamente a Amendoeira. Novos administradores cadastrados para Pacheco também recebem acesso às duas unidades.</div>",
        "<h2>2. Acessos e unidades</h2>",
        "<ul><li>Na entrada, cada usuário seleciona a unidade de acesso.</li><li>O seletor no topo permite alternar entre “Todas as unidades”, Pacheco e Amendoeira (para administradores de Pacheco).</li><li>Não existe criação pública de contas: somente administradores cadastram, editam e excluem usuários.</li></ul>",
        "<h2>3. Usuários</h2>",
        "<ol><li>Acesse <b>Usuários</b> e clique em <b>Novo usuário</b>.</li><li>Informe nome completo, e-mail, telefone, perfil, unidades, equipes e funções. Para dirigentes, selecione as permissões específicas. É possível marcar uma unidade específica ou as duas unidades.</li><li>Ao salvar, o acesso é liberado automaticamente, sem envio de convite.</li><li>O cadastro permanece como <b>Aguardando primeiro login</b> até o usuário entrar com o e-mail informado. Depois disso, o status muda automaticamente para ativo.</li></ol>",
        "<p>A listagem mostra o nome, o telefone e as equipes. A busca localiza por nome, e-mail, telefone ou equipe. Clique no nome para ver todos os dados, editar, bloquear, liberar acesso ou excluir. As abas separam todos os usuários, administradores, dirigentes, voluntários, aguardando primeiro login e acessos bloqueados.</p>",
        "<p>O detalhe do cadastro exibe <b>serviços realizados</b>, serviços no mês, serviços já agendados e a data do último serviço. No <b>Painel</b>, o card <b>Alertas de serviço</b> destaca quem nunca serviu ou está há 60 dias ou mais sem servir, com o total de serviços e a data do último.</p>",
        "<div class='note'>Ao excluir um usuário, as escalas futuras em que ele estava alocado passam a constar como vaga aberta. A exclusão é registrada no histórico.</div>",
        "<h2>4. Voluntários</h2>",
        "<p>A tela de <b>Usuários</b> reúne voluntários, dirigentes e administradores em um único cadastro. A aba <b>Voluntários</b> filtra apenas esse perfil, e o mesmo botão <b>Novo usuário</b> cadastra qualquer tipo de acesso. Assim não há duplicidade entre as antigas telas de usuários e voluntários.</p>",
        "<p>Cada pessoa pode estar em várias equipes e funções e pertencer a uma ou às duas unidades. Os dados incluem nome, telefone/WhatsApp, e-mail, unidades, equipes, funções, nome do condutor(a) e o mês informado no formulário de primeiro acesso.</p>",
        "<h2>5. Equipes e funções</h2>",
        "<ul><li>Crie equipes por unidade (Som, Projeção, Recepção, Louvor, Comunicação, Organização).</li><li>Em cada equipe, cadastre funções e a quantidade de vagas por função.</li><li>Exemplos: Comunicação — Projeção (2 vagas); Recepção — Recepcionista (4 vagas); Som — Operador de áudio (2 vagas).</li></ul>",
        "<p>Ao excluir uma equipe ou função, os vínculos dos voluntários são ajustados e as alocações afetadas viram vaga aberta.</p>",
        "<h2>6. Eventos</h2>",
        "<p>Cadastre nome, data, horário, unidade, equipes necessárias, funções e vagas por função. Os eventos aparecem no calendário de disponibilidade dos voluntários e são bloqueados para marcação comum.</p>",
        "<h2>7. Escalas</h2>",
        "<ol><li>Em <b>Escalas</b>, escolha o evento e clique em <b>Montar escala</b>.</li><li>Para cada vaga, use <b>Escolher voluntário</b>.</li><li>O sistema mostra a disponibilidade do mês, a folga, a unidade, o número de serviços já realizados e bloqueia quem está em conflito de horário — inclusive entre unidades.</li><li>Preencha as vagas e clique em <b>Salvar escala</b>.</li><li>A escala pode ser editada depois de montada; toda alteração entra no histórico.</li></ol>",
        "<p><b>Folga automática:</b> ao completar três serviços no mês, o voluntário entra em folga e não pode ser escalado até a liberação administrativa. A liberação é feita na própria escala ou no acompanhamento de folgas e fica registrada no histórico.</p>",
        "<h2>8. Disponibilidades</h2>",
        "<p>O calendário fica no perfil do voluntário, sem link externo. Os dias com eventos não podem ser marcados. Depois do envio, o voluntário não altera as datas. Em <b>Disponibilidades</b>, selecione o mês para consultar quem respondeu, quem ainda não respondeu e o detalhe de cada calendário.</p>",
        "<h2>9. Confirmações e recusas</h2>",
        "<p>Ao entrar, o voluntário escalado recebe uma janela destacada com o evento e as opções <b>Confirmar presença</b>, <b>Recusar presença</b> e <b>Solicitar troca</b>. A resposta é registrada uma única vez e não pode ser alterada. O administrador acompanha confirmados, recusados, pendentes e vagas abertas no painel.</p>",
        "<h2>10. Trocas</h2>",
        "<ul><li>Limite de duas solicitações por mês por usuário.</li><li>Não é permitido solicitar troca faltando um dia (ou menos) para o evento.</li><li>Pessoas já escaladas no mesmo evento não podem ser sugeridas, mesmo que tenham recusado.</li><li>A aprovação é exclusiva do administrador. Ao aprovar com pessoa sugerida, a vaga é transferida e o substituto deve confirmar. Sem sugestão, a vaga fica aberta.</li><li>O solicitante e o substituto são notificados; a decisão entra no histórico.</li></ul>",
        "<h2>11. WhatsApp</h2>",
        "<p>É possível enviar para todos os voluntários de uma escala, para pessoas selecionadas ou para todos os voluntários de uma unidade. Modelos disponíveis: convocação, confirmação, lembrete na véspera, solicitação, aprovação e rejeição de troca e comunicados gerais. A convocação inclui data, horário, equipe, função e um <b>link de confirmação</b> que abre o sistema diretamente na página de eventos e escalas do voluntário.</p>",
        "<div class='note'>As mensagens de uma escala são preparadas em uma única operação para todos os selecionados. O envio é feito exclusivamente por links wa.me, que abrem a conversa individual de cada pessoa no WhatsApp. Ao abrir o link de confirmação, o voluntário entra com o próprio e-mail e confirma, recusa ou solicita troca — a resposta é definitiva.</div>",
        "<p>Para enviar a mesma mensagem a várias pessoas de uma só vez, selecione os destinatários e clique em <b>Enviar a todos de uma vez</b>: o sistema abre uma conversa no WhatsApp Web para cada pessoa, já com o texto preenchido. A saudação é a mesma para todos — <b>“Olá irmão (ã)”</b> — e cada pessoa recebe o próprio link de confirmação, quando o modelo tiver link. Em cada aba, confira e toque em Enviar. O botão <b>Preparar e revisar</b> mostra a lista antes de abrir. Nas conversas individuais, cada pessoa também tem os caminhos aplicativo, WhatsApp Web e copiar; o WhatsApp Web é o mais indicado no computador, porque mantém o texto preenchido.</p>",
        "<div class='note'>O WhatsApp não permite que um site envie a mensagem sozinho: o toque em Enviar é sempre feito dentro do WhatsApp. O navegador pode bloquear a abertura de várias abas; libere pop-ups para este site ou use <b>Preparar e revisar</b> e abra cada conversa pelo botão individual.</div>",
        "<h2>12. LGPD</h2>",
        "<p>O consentimento é solicitado no final da página de entrada, com “Concordo e autorizo” e “Não concordo e não autorizo” visíveis ao mesmo tempo. O aceite registra data, hora e versão do termo <b>uma única vez</b>: nos próximos acessos o usuário entra diretamente, sem marcar novamente. A recusa bloqueia o acesso; o usuário pode solicitar liberação ao administrador. A liberação permite novo login e nova decisão, sem excluir o cadastro.</p>",
        "<p>O administrador consulta os consentimentos, com data, hora e versão do termo, no detalhe de cada usuário.</p>",
        "<h2>13. Histórico e notificações</h2>",
        "<p>O histórico é exclusivo do administrador e registra cadastros, alterações, exclusões, equipes, eventos, escalas, confirmações, recusas, trocas, liberações de acesso e de folga e consentimentos. Cada registro contém responsável, ação, data/hora e dados anteriores e posteriores. As notificações reúnem avisos de formulários, disponibilidades, respostas, trocas e acessos.</p>",
        "<h2>14. Segurança e sessões</h2>",
        "<ul><li>A sessão expira após 8 horas de inatividade; ao expirar, o login é exigido novamente.</li><li>A versão local mantém os dados no navegador. Cada navegador, celular ou conta possui um armazenamento próprio: cadastros criados em um dispositivo não aparecem automaticamente em outro.</li><li>Para usar o sistema em outro navegador ou dispositivo, acesse <b>Histórico</b>, clique em <b>Baixar backup</b> e, no outro dispositivo, use <b>Importar backup</b>. A importação substitui os dados locais e fica registrada no histórico.</li><li>A implantação em produção deve usar banco de dados persistente, autenticação por e-mail, permissões validadas no servidor, proteção por unidade, auditoria e rotinas de backup automatizadas.</li></ul>",
        "<h2>15. Manuais</h2>",
        "<p>Nenhuma alteração funcional é considerada concluída sem a atualização dos manuais. Cada manual exibe versão e data da última atualização e pode ser baixado em PDF pelo botão no canto superior.</p>"
      ].join("")
    },
    dirigente: {
      id: "dirigente",
      title: "Manual do Dirigente",
      subtitle: "Permissões, equipes, disponibilidade, escalas, confirmações e trocas",
      body: [
        "<h2>1. Seu perfil</h2>",
        "<p>O dirigente possui todas as funções de um voluntário e pode receber permissões administrativas específicas, selecionadas pelo administrador. As permissões liberam o acompanhamento das equipes, escalas, disponibilidades e mensagens — nunca a aprovação de trocas ou a exclusão de cadastros.</p>",
        "<h2>2. Primeiro acesso</h2>",
        "<p>Entre com o e-mail cadastrado pelo administrador, selecione a unidade e registre o consentimento LGPD. No primeiro acesso, o formulário obrigatório apresenta as orientações do voluntariado, os horários de culto e os campos de nome, telefone, unidade(s), condutor(a) e mês de disponibilidade. As respostas não podem ser editadas depois do envio.</p>",
        "<h2>3. Disponibilidade</h2>",
        "<ul><li>Acesse <b>Minha disponibilidade</b> e navegue pelo mês.</li><li>Marque os dias em que poderá servir e clique em <b>Salvar disponibilidade</b>.</li><li>Dias com eventos ficam bloqueados e não podem ser marcados.</li><li>Após o envio, as datas ficam bloqueadas. O administrador consulta todas as respostas.</li></ul>",
        "<h2>4. Equipes e escalas</h2>",
        "<p>Conforme as permissões recebidas, o dirigente acompanha as equipes, funções e vagas, consulta as escalas e verifica a disponibilidade dos voluntários. A montagem e a edição de escalas são realizadas pelo administrador, assim como a liberação de folgas.</p>",
        "<h2>5. Confirmações e recusas</h2>",
        "<p>Quando escalado, o sistema apresenta uma janela destacada com o evento e as opções confirmar, recusar ou solicitar troca. A resposta é definitiva após o registro. Dirigentes também atuam como voluntários e seguem as mesmas regras.</p>",
        "<h2>6. Solicitações de troca</h2>",
        "<ul><li>O limite é de duas solicitações por mês.</li><li>Não é possível solicitar troca faltando um dia para o evento.</li><li>Não é possível sugerir alguém já escalado no mesmo evento.</li><li>Toda troca depende exclusivamente da aprovação do administrador.</li><li>O resultado da solicitação é informado ao solicitante.</li></ul>",
        "<h2>7. Comunicação</h2>",
        "<p>Com a permissão de WhatsApp, o dirigente prepara convocações, lembretes e comunicados para os voluntários da escala, pessoas selecionadas ou todos de uma unidade. As mensagens de uma escala são preparadas em uma única operação.</p>",
        "<h2>8. LGPD</h2>",
        "<p>Os dados informados são usados exclusivamente para cadastro, organização, comunicação, convocação e elaboração das escalas. O consentimento registra data, hora e versão do termo. Em caso de recusa, o acesso é bloqueado e pode ser solicitada a liberação ao administrador, sem exclusão do cadastro.</p>",
        "<h2>9. Boas práticas</h2>",
        "<ul><li>Comunique imprevistos ao dirigente de culto com no mínimo dois dias de antecedência, sempre que possível.</li><li>Mantenha telefone e disponibilidade atualizados junto ao administrador.</li><li>Chegue com antecedência e confirme presença assim que receber a convocação.</li></ul>"
      ].join("")
    },
    voluntario: {
      id: "voluntario",
      title: "Manual do Voluntário",
      subtitle: "Primeiro acesso, cadastro, disponibilidade, consulta de escala, confirmação e troca",
      body: [
        "<h2>1. Como entrar</h2>",
        "<ol><li>Na tela inicial, selecione a unidade (Pacheco ou Amendoeira).</li><li>Informe o e-mail cadastrado pelo administrador. Não existe criação pública de conta.</li><li>Escolha uma das opções de consentimento LGPD no final da página: <b>Concordo e autorizo</b> ou <b>Não concordo e não autorizo</b>.</li><li>Clique em <b>Entrar</b>.</li></ol>",
        "<div class='note'>Se você recusar o termo, o acesso será bloqueado. A tela explicará o motivo e permitirá solicitar a liberação ao administrador. A recusa não exclui o seu cadastro. Se o seu e-mail não for localizado, o cadastro pode ter sido feito em outro dispositivo — peça ao administrador para importar o backup dos dados.</div>",
        "<h2>2. Formulário obrigatório do primeiro acesso</h2>",
        "<p>No primeiro acesso, preencha o formulário de disponibilidade do voluntário: nome completo, telefone para contato, unidade ou unidades, nome do condutor(a) e mês de disponibilidade. Leia com atenção as orientações sobre compromisso e responsabilidade.</p>",
        "<p>Os principais horários de culto são: <b>quarta-feira às 19h30</b>, <b>domingo às 10h</b> e <b>domingo às 19h</b>. O preenchimento não representa obrigação de servir em todos os dias ou horários indicados; a disponibilidade serve de referência para a organização das escalas.</p>",
        "<div class='note'>As respostas são enviadas ao administrador e armazenadas no cadastro. O usuário comum não pode editar as respostas depois do envio.</div>",
        "<h2>3. Minha disponibilidade</h2>",
        "<ul><li>Abra <b>Minha disponibilidade</b> no menu.</li><li>Marque os dias em que poderá servir no mês exibido.</li><li>Dias que possuem eventos aparecem destacados e não podem ser marcados como disponibilidade comum.</li><li>Clique em <b>Salvar disponibilidade</b> e confirme.</li><li>Depois do envio, as datas ficam bloqueadas para o voluntário. Em caso de necessidade, fale com o administrador.</li></ul>",
        "<h2>4. Minhas escalas</h2>",
        "<p>Você visualiza somente as informações pertinentes às suas próprias escalas. Ao entrar no sistema e estiver escalado, aparece uma janela destacada informando o evento, a data, o horário e a função. Na mesma tela estão disponíveis <b>Confirmar presença</b>, <b>Recusar presença</b> e <b>Solicitar troca</b>.</p>",
        "<p>Após confirmar ou recusar, a tela muda visualmente para mostrar a decisão. A resposta é registrada e <b>não pode ser alterada</b>: não existe opção de responder novamente.</p>",
        "<h2>5. Solicitar troca</h2>",
        "<ul><li>O limite é de duas solicitações por mês.</li><li>Não é possível solicitar troca faltando um dia para o evento.</li><li>Você pode indicar uma pessoa, mas ela não pode estar já escalada no mesmo evento.</li><li>A troca depende exclusivamente da aprovação do administrador.</li><li>Você recebe o resultado da solicitação no sistema.</li></ul>",
        "<h2>6. Folga automática</h2>",
        "<p>O sistema conta os serviços realizados no mês. Ao completar três serviços, você entra automaticamente em folga e não pode ser escalado novamente até que o administrador libere. A liberação é registrada no histórico administrativo.</p>",
        "<h2>7. Meu perfil e LGPD</h2>",
        "<p>Em <b>Meu perfil</b> você consulta seus dados, equipes, funções, o histórico de serviços, suas disponibilidades e o registro do consentimento LGPD (data, hora e versão do termo). Para alterar dados do cadastro, procure um administrador.</p>",
        "<h2>8. Compromisso</h2>",
        "<p>Servir é mais do que cumprir uma escala: é ministrar na vida das pessoas e colocar dons e talentos à disposição do Reino de Deus. Se surgir um imprevisto, comunique o dirigente de culto com no mínimo dois dias de antecedência, sempre que possível, para que haja tempo hábil de organizar uma substituição.</p>",
        "<p><b>Juntos por um servir ainda mais forte!</b></p>"
      ].join("")
    }
  };

  function visibleManuals() {
    var role = N.currentUser().role;
    if (role === "admin") return ["admin", "dirigente", "voluntario"];
    if (role === "dirigente") return ["dirigente", "voluntario"];
    return ["voluntario"];
  }

  var view = {
    render: function () {
      var role = N.currentUser().role;
      var allowed = visibleManuals();
      if (manualRole !== role) {
        activeManual = role === "admin" ? "admin" : role === "dirigente" ? "dirigente" : "voluntario";
        manualRole = role;
      }
      if (allowed.indexOf(activeManual) < 0) activeManual = allowed[0];
      var m = manuals[activeManual];
      var tabs = allowed.length > 1
        ? '<div class="tabs no-print" style="max-width:860px">' + allowed.map(function (id) {
            return '<button class="tab ' + (activeManual === id ? "active" : "") + '" data-manual="' + id + '">' + esc(manuals[id].title) + "</button>";
          }).join("") + "</div>"
        : "";

      var body =
        '<div class="page-head no-print"><div><h1>' + esc(m.title) + "</h1>" +
          '<p class="desc">Versão ' + esc(N.MANUAL_VERSION) + " · última atualização em " + esc(N.MANUAL_DATE) + ". Leitura adaptada para celulares e computadores.</p></div>" +
          '<div class="btn-group"><button class="btn btn-primary" id="manual-pdf">' + N.icon("pdf") + " Baixar PDF</button></div>" +
        "</div>" +
        tabs +
        '<div class="manual" id="manual-content">' +
          "<h1>" + esc(m.title) + "</h1>" +
          '<div class="manual-sub"><span>Agentes do Amor AMI · AMI Pacheco e Amendoeira</span><span>Versão ' + esc(N.MANUAL_VERSION) + " · " + esc(N.MANUAL_DATE) + "</span></div>" +
          "<p><b>" + esc(m.subtitle) + ".</b></p>" +
          m.body +
          '<div class="note" style="margin-top:26px">Este manual deve ser atualizado sempre que houver mudanças no sistema. Versão ' + esc(N.MANUAL_VERSION) + " — atualizado em " + esc(N.MANUAL_DATE) + ".</div>" +
        "</div>";

      return body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-manual]"), function (b) {
        b.addEventListener("click", function () { activeManual = b.getAttribute("data-manual"); N.render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      });
      var btn = document.getElementById("manual-pdf");
      if (btn) btn.addEventListener("click", function () { printManual(manuals[activeManual]); });
    }
  };

  function printManual(m) {
    var win = window.open("", "_blank");
    if (!win) { N.toast("Permita janelas pop-up para gerar o PDF.", "warn"); return; }
    var css = [
      "body{font-family:'Segoe UI',Arial,sans-serif;color:#1b1b1f;line-height:1.65;font-size:13px;margin:38px 46px;max-width:820px}",
      "h1{font-size:24px;color:#12090b;margin:0 0 4px}",
      ".manual-sub{color:#6a6a72;font-size:12px;border-bottom:2px solid #e0102a;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}",
      "h2{font-size:16px;color:#b00d22;margin:24px 0 8px}",
      "p{margin:0 0 10px} ul,ol{margin:0 0 10px;padding-left:20px} li{margin-bottom:5px}",
      ".note{background:#fdf1f3;border-left:3px solid #e0102a;padding:11px 13px;font-size:12px;margin:12px 0}",
      ".footer{margin-top:26px;border-top:1px solid #ddd;padding-top:10px;font-size:11px;color:#777}",
      "@page{margin:14mm}"
    ].join("\n");
    win.document.write("<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'/><title>" + m.title + "</title><style>" + css + "</style></head><body>" +
      "<h1>" + m.title + "</h1>" +
      "<div class='manual-sub'><span>Agentes do Amor AMI · AMI Pacheco e Amendoeira</span><span>Versão " + N.MANUAL_VERSION + " · " + N.MANUAL_DATE + "</span></div>" +
      "<p><b>" + m.subtitle + ".</b></p>" + m.body +
      "<div class='footer'>Documento gerado pelo sistema Agentes do Amor AMI em " + new Date().toLocaleDateString("pt-BR") + " · Versão " + N.MANUAL_VERSION + "</div>" +
      "</body></html>");
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 500);
  }

  N.views = N.views || {};
  N.views["manuais"] = view;
  N.views["vol-manual"] = view;
  N.MANUALS = manuals;
  N.setActiveManual = function (id) { activeManual = id; };
})(window.AMI);
