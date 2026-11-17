/* Entrada, consentimento LGPD e formulário obrigatório de primeiro acesso */
(function (N) {
  "use strict";
  var U = N.util;
  var esc = N.esc;

  var authState = { unit: "pacheco", consent: null, email: "", error: "", blocked: null, requested: false };

  function shell(inner, wide) {
    return '<div class="auth">' +
      '<section class="auth-art">' +
        '<div class="brand-mark" role="img" aria-label="Identidade visual Agentes do Amor AMI"></div>' +
        '<div><span class="kicker">Ministério de voluntários</span>' +
        "<h1>Agentes do<br/><em>Amor</em> AMI</h1></div>" +
        '<p class="lead">Organização, integração e avanço. Um único lugar para cuidar da disponibilidade, das escalas e do servir em cada unidade.</p>' +
        '<div class="verse"><span>“</span><div>Servir é uma dedicação a Deus e não aos homens. <strong>Juntos por um servir ainda mais forte!</strong></div></div>' +
      "</section>" +
      '<section class="auth-panel"><div class="auth-card' + (wide ? ' style="max-width:760px"' : "") + '">' + inner + "</div>" +
      '<div class="demo-hint">Ambiente de demonstração local · unidade Pacheco: <b>werleyvenceslau17@gmail.com</b> · liderança: <b>leon@ami.com</b> · voluntário: <b>debora@ami.com</b> · unidade Amendoeira: <b>cesarigrejaami@gmail.com</b></div>' +
      "</section></div>";
  }

  function loginScreen() {
    var inner =
      '<div class="row-between" style="align-items:flex-start">' +
        "<div><h2>Entrar no sistema</h2><p class=\"sub\">Selecione a unidade de acesso e informe o e-mail cadastrado pelo administrador.</p></div>" +
        '<span class="badge red plain">' + N.icon("shield") + " Acesso restrito</span>" +
      "</div>" +
      '<div class="unit-picker" role="tablist" aria-label="Unidade de acesso">' +
        N.state().units.map(function (u) {
          return '<button type="button" role="tab" aria-selected="' + (authState.unit === u.id) + '" class="unit-option ' + (authState.unit === u.id ? "active" : "") + '" data-unit="' + u.id + '">' +
            "<b>" + esc(u.name) + "</b><span>" + esc(u.description) + "</span></button>";
        }).join("") +
      "</div>" +
      '<form id="login-form" novalidate>' +
        '<div class="field"><label for="login-email">E-mail de acesso <span class="req">*</span></label>' +
          '<input class="input" id="login-email" name="email" type="email" autocomplete="username" placeholder="seu.email@exemplo.com" value="' + esc(authState.email) + '" />' +
        "</div>" +
        '<div id="login-error" style="margin-top:10px">' + (authState.error ? '<div class="alert danger">' + esc(authState.error) + "</div>" : "") + "</div>" +
        '<button class="btn btn-primary btn-block" type="submit" style="margin-top:14px">Entrar</button>' +
      "</form>" +
      '<div class="consent" id="consent-block">' +
        '<span class="lgpd-tag">' + N.icon("shield") + " LGPD · " + esc(N.LGPD_LAW) + "</span>" +
        "<p><b>Autorização para tratamento de dados pessoais.</b> Em conformidade com a " + esc(N.LGPD_LAW) + " — Lei Geral de Proteção de Dados Pessoais, autorizo o tratamento dos dados pessoais fornecidos ao sistema Agentes do Amor AMI para cadastro, organização de voluntários, comunicação, convocações, elaboração de escalas e gerenciamento das atividades das unidades.</p>" +
        (authState.consent === "aceito"
          ? '<div class="consent-state">' + N.icon("check") + "<div>Consentimento selecionado: <b>Concordo e autorizo</b> · versão " + esc(N.termVersion()) + ". A data e a hora serão registradas ao entrar.</div></div>"
          : authState.consent === "recusado"
            ? '<div class="consent-state refused">' + N.icon("alert") + "<div>Consentimento selecionado: <b>Não concordo e não autorizo</b>. O acesso será bloqueado ao entrar. Você poderá solicitar a liberação ao administrador.</div></div>"
            : "") +
        '<div class="consent-actions" style="margin-top:12px">' +
          '<button type="button" class="btn btn-primary ' + (authState.consent === "aceito" ? "" : "btn-ghost") + '" data-consent="aceito">Concordo e autorizo</button>' +
          '<button type="button" class="btn btn-refuse ' + (authState.consent === "recusado" ? "active" : "") + '" data-consent="recusado"' + (authState.consent === "recusado" ? ' style="border-color:rgba(224,16,42,.55);color:#ffc2ca"' : "") + ">Não concordo e não autorizo</button>" +
        "</div>" +
        '<p class="tiny" style="margin:12px 0 0;letter-spacing:0;text-transform:none;color:#6f757d">A autorização é obrigatória, fica registrada uma única vez com data, hora e versão do termo e não precisa ser marcada novamente nos próximos acessos. A recusa não exclui o cadastro: o acesso permanece bloqueado até a regularização.</p>' +
      "</div>";

    document.getElementById("app").innerHTML = shell(inner);
    bindLogin();
  }

  function bindLogin() {
    var app = document.getElementById("app");
    Array.prototype.forEach.call(app.querySelectorAll("[data-unit]"), function (b) {
      b.addEventListener("click", function () {
        authState.unit = b.getAttribute("data-unit");
        authState.error = "";
        loginScreen();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-consent]"), function (b) {
      b.addEventListener("click", function () {
        authState.consent = b.getAttribute("data-consent");
        authState.error = "";
        authState.email = (document.getElementById("login-email") || {}).value || authState.email;
        loginScreen();
        if (authState.consent === "recusado") {
          var c = document.getElementById("consent-block");
          if (c) c.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });
    var form = document.getElementById("login-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      authState.email = email;
      if (!email) { showError("Informe o seu e-mail de acesso."); return; }
      var existing = N.state().users.find(function (x) { return x.email.toLowerCase() === email.toLowerCase(); });
      var alreadyAccepted = existing && existing.lgpd && existing.lgpd.status === "aceito";
      if (!authState.consent && !alreadyAccepted) { showError("Escolha uma das opções de consentimento LGPD no final desta página para continuar."); return; }
      var res = N.login(email, authState.unit, authState.consent || "aceito");
      if (!res.ok) {
        if (res.blocked) { authState.blocked = { email: email }; renderBlocked(res.message); return; }
        showError(res.message, /não encontrado/i.test(res.message)
          ? "Os cadastros ficam salvos no navegador onde foram criados. Se a conta foi cadastrada em outro dispositivo, peça ao administrador para importar o backup em Histórico → Transferir cadastros entre navegadores."
          : "");
        return;
      }
      authState.consent = null;
      authState.error = "";
      authState.blocked = null;
      N.toast(res.firstLogin ? "Primeiro acesso registrado. Bem-vindo(a)!" : "Bem-vindo(a), " + res.user.name.split(" ")[0] + "!", "ok");
      N.render();
    });
    var input = document.getElementById("login-email");
    input.addEventListener("input", function () { authState.email = input.value; });
    input.focus();
  }

  function showError(msg, hint) {
    authState.error = msg;
    var box = document.getElementById("login-error");
    if (box) box.innerHTML = '<div class="alert danger">' + esc(msg) +
      (hint ? '<div class="tiny" style="margin-top:7px;letter-spacing:0;text-transform:none;color:#ffc2ca">' + esc(hint) + "</div>" : "") + "</div>";
  }

  function renderBlocked(message) {
    var email = (authState.blocked && authState.blocked.email) || "";
    var u = N.state().users.find(function (x) { return x.email.toLowerCase() === email.toLowerCase(); });
    var inner =
      '<div class="blocked-card">' +
        '<div class="blocked-icon">' + N.icon("shield") + "</div>" +
        "<h3>Acesso bloqueado</h3>" +
        "<p>" + esc(message || "O consentimento LGPD é obrigatório para utilizar o sistema.") + "</p>" +
        '<p style="font-size:12px;color:#8f949b;margin-top:10px">A recusa não exclui o seu cadastro. O acesso permanece bloqueado até a liberação do administrador. Depois da liberação, entre novamente e registre uma nova decisão.</p>' +
        '<div class="btn-group" style="justify-content:center;margin-top:18px">' +
          (authState.requested
            ? '<span class="badge green">Solicitação enviada ao administrador</span>'
            : '<button class="btn btn-primary" id="ask-release">Solicitar liberação ao administrador</button>') +
          '<button class="btn btn-ghost" id="back-login">Voltar</button>' +
        "</div>" +
        (u ? '<div class="tiny" style="margin-top:16px;letter-spacing:0;text-transform:none">Cadastro: ' + esc(u.email) + " · " + esc(N.unitName(authState.unit)) + "</div>" : "") +
      "</div>";
    document.getElementById("app").innerHTML = shell(inner);
    var ask = document.getElementById("ask-release");
    if (ask) ask.addEventListener("click", function () {
      if (!u) { N.toast("E-mail não localizado.", "warn"); return; }
      N.requestAccessRelease(u.id);
      authState.requested = true;
      renderBlocked(message);
      N.toast("Solicitação de liberação enviada.", "ok");
    });
    document.getElementById("back-login").addEventListener("click", function () {
      authState.blocked = null;
      authState.consent = null;
      authState.requested = false;
      authState.error = "";
      loginScreen();
    });
  }

  function monthOptions(selected) {
    var base = N.state().settings.availabilityMonth || U.monthOf(U.todayISO());
    var list = [];
    for (var i = 0; i < 3; i++) {
      var m = N.util.addMonths(base, i);
      list.push({ value: m, label: U.monthLabel(m) });
    }
    if (list.every(function (o) { return o.value !== selected; })) list.unshift({ value: selected, label: U.monthLabel(selected) });
    return N.options(list, selected);
  }

  function firstAccessScreen(user) {
    var settings = N.state().settings;
    var month = settings.availabilityMonth || U.monthOf(U.todayISO());
    var inner =
      '<div style="margin-bottom:18px">' +
        '<span class="lgpd-tag" style="display:inline-flex;align-items:center;gap:7px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#ffb3bd;border:1px solid rgba(224,16,42,.35);background:rgba(224,16,42,.08);padding:4px 9px;border-radius:999px">' + N.icon("info") + " Primeiro acesso · obrigatório</span>" +
        "<h2 style=\"margin-top:12px\">Formulário de disponibilidade do Voluntário</h2>" +
        '<p class="sub">AMOR E MOVIMENTO IGREJA · AMI — Pacheco e Amendoeira</p>' +
      "</div>" +
      '<div class="stack" style="font-size:12.8px;color:#b9bcc2;line-height:1.65">' +
        "<p style=\"margin:0\">Este formulário tem como objetivo <b>organizar a disponibilidade dos voluntários da Amor e Movimento Igreja (AMI)</b> para o servir nos cultos.</p>" +
        "<p style=\"margin:0\">Por meio deste cadastro, cada voluntário poderá informar <b>os dias e horários em que possui disponibilidade para servir</b>, contribuindo para uma organização mais eficiente das escalas e permitindo que as convocações sejam realizadas de acordo com as disponibilidades informadas.</p>" +
        "<p style=\"margin:0\">Atualmente, os principais horários de culto são:</p>" +
        '<ul style="margin:0;padding-left:20px;color:#d4d6da"><li><b>Quarta-feira:</b> 19:30 horas</li><li><b>Domingo:</b> 10:00 horas</li><li><b>Domingo:</b> 19:00 horas</li></ul>' +
        '<div class="alert info">' + N.icon("info") + "<div>As informações fornecidas serão utilizadas exclusivamente para fins de <b>cadastro, organização, comunicação, convocação e elaboração das escalas de voluntariado da AMI</b>. O preenchimento não representa obrigação de servir em todos os dias ou horários indicados.</div></div>" +
        '<p style="margin:0"><b>Porém, lembramos que servir é uma dedicação a Deus e não aos homens.</b> Quando nos colocamos à disposição para servir, estamos também assumindo um compromisso com aquilo que Deus nos confiou e com as pessoas que serão alcançadas por meio do nosso serviço.</p>' +
        '<p style="margin:0">Por isso, pedimos que, ao informar sua disponibilidade e se colocar à disposição para servir durante o mês de <b id="fa-month-label">' + esc(U.monthLabel(month)) + "</b>, tenha em mente esse compromisso. A escala será organizada considerando as disponibilidades informadas e, uma vez escalado, contamos com a responsabilidade e o comprometimento de cada voluntário.</p>" +
        '<p style="margin:0">Sabemos que imprevistos podem acontecer. Caso você seja escalado e, por algum motivo, não possa comparecer, pedimos que <b>comunique o dirigente de culto com, no mínimo, 2 (dois) dias de antecedência</b>, sempre que possível. Essa comunicação é fundamental para que haja tempo hábil para organizar uma substituição.</p>' +
        '<p style="margin:0"><b>Servir é mais do que cumprir uma escala.</b> É ministrar na vida das pessoas, contribuir para que a igreja funcione de forma organizada e colocar nossos dons e talentos à disposição do Reino de Deus.</p>' +
      "</div>" +
      '<hr class="divider" />' +
      '<form id="fa-form" novalidate class="stack">' +
        '<div class="form-grid">' +
          '<div class="field full"><label>Nome Completo <span class="req">*</span></label><input class="input" name="name" value="' + esc(user.name) + '" placeholder="Sua resposta" /></div>' +
          '<div class="field full"><label>Número de telefone para contato <span class="req">*</span></label><input class="input" name="phone" value="' + esc(user.phone) + '" placeholder="(00) 00000-0000" inputmode="tel" /></div>' +
          '<div class="field full"><label>Unidade ou unidades <span class="req">*</span></label>' +
            '<div class="chip-set">' + N.state().units.map(function (un) {
              return '<label class="chip ' + (user.units.indexOf(un.id) >= 0 ? "on" : "") + '" data-unit-chip="' + un.id + '"><input type="checkbox" name="units" value="' + un.id + '" data-multi="1"' + (user.units.indexOf(un.id) >= 0 ? " checked" : "") + " />" + esc(un.name) + "</label>";
            }).join("") + "</div>" +
            '<span class="help">Cada voluntário pode pertencer a uma ou às duas unidades.</span></div>' +
          '<div class="field full"><label>Qual o nome do seu Condutor(a) <span class="req">*</span></label><input class="input" name="conductor" value="' + esc(user.conductor) + '" placeholder="Sua resposta" /></div>' +
          '<div class="field full"><label>Mês de disponibilidade <span class="req">*</span></label><select class="select" name="month">' + monthOptions(month) + "</select>" +
            '<span class="help">O mês corrente é usado como referência. A disponibilidade é marcada depois, no calendário do seu perfil.</span></div>' +
        "</div>" +
        '<div class="alert warn">' + N.icon("alert") + '<div><b>Não será possível editar estas respostas depois do envio.</b> Elas serão enviadas ao administrador e armazenadas no seu cadastro.</div></div>' +
        '<div class="field" style="gap:10px;border:1px solid var(--line);border-radius:12px;padding:14px;background:rgba(255,255,255,.02)">' +
          "<div><b style=\"font-size:12.5px\">Autorização de tratamento de dados — LGPD</b>" +
          '<p class="small" style="color:#9aa0a8;margin:6px 0 0">Em conformidade com a ' + esc(N.LGPD_LAW) + " — Lei Geral de Proteção de Dados Pessoais, autorizo o tratamento dos dados pessoais fornecidos para cadastro, organização de voluntários, comunicação, convocações, elaboração de escalas e gerenciamento das atividades das unidades.</p></div>" +
          '<label class="check"><input type="checkbox" name="consent" /> Li e concordo com a autorização de tratamento dos meus dados pessoais.</label>' +
        "</div>" +
        '<div id="fa-error"></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" type="submit">Enviar formulário</button></div>' +
      "</form>" +
      '<p class="tiny" style="margin-top:14px;letter-spacing:0;text-transform:none;color:#6f757d">Líder responsável: Leon Dias · Após o envio, procure um administrador caso precise corrigir alguma informação.</p>';

    document.getElementById("app").innerHTML = shell(inner, true);
    var form = document.getElementById("fa-form");

    Array.prototype.forEach.call(form.querySelectorAll("[data-unit-chip]"), function (chip) {
      var cb = chip.querySelector("input");
      cb.addEventListener("change", function () { chip.classList.toggle("on", cb.checked); });
    });
    form.month.addEventListener("change", function () {
      document.getElementById("fa-month-label").textContent = U.monthLabel(form.month.value);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = N.formValues(form);
      var units = v.units || [];
      var err = [];
      if (!v.name || v.name.trim().split(/\s+/).length < 2) err.push("Informe o nome completo.");
      if (U.digits(v.phone).length < 10) err.push("Informe um telefone válido com DDD.");
      if (!units.length) err.push("Selecione ao menos uma unidade.");
      if (!v.conductor || !v.conductor.trim()) err.push("Informe o nome do seu condutor(a).");
      if (!v.consent) err.push("É necessário concordar com a autorização de tratamento de dados.");
      if (err.length) {
        document.getElementById("fa-error").innerHTML = '<div class="alert danger">' + N.icon("alert") + "<div>" + err.map(esc).join("<br/>") + "</div></div>";
        return;
      }
      var ok = N.completeFirstAccess(user.id, {
        name: v.name, phone: v.phone, units: units, conductor: v.conductor, month: v.month, consent: true
      });
      if (!ok) { N.toast("Este formulário já foi enviado.", "warn"); return; }
      N.toast("Formulário enviado. Seu cadastro está completo!", "ok");
      N.render();
    });
  }

  N.auth = {
    loginScreen: loginScreen,
    firstAccessScreen: firstAccessScreen,
    renderBlocked: renderBlocked,
    reset: function () { authState = { unit: "pacheco", consent: null, email: "", error: "", blocked: null, requested: false }; }
  };
})(window.AMI);
