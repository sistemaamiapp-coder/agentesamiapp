/* Área do voluntário e do dirigente */
(function (N) {
  "use strict";
  var U = N.util;
  var esc = N.esc;

  function me() { return N.currentUser(); }

  function myAssignments(userId) {
    return N.assignmentsOf(userId).filter(function (item) {
      return item.assignment.userId === userId;
    });
  }

  function upcoming(userId) {
    return myAssignments(userId).filter(function (i) {
      return U.daysUntil(i.event.date) >= 0 && i.assignment.status !== "vaga_aberta";
    });
  }

  function pending(userId) {
    return upcoming(userId).filter(function (i) { return i.assignment.status === "pendente"; });
  }

  function eventTitle(i) {
    return i.event.name + " · " + N.unitName(i.event.unit, true);
  }

  function assignStatusBadge(status) {
    return N.statusBadge(status, "assignment");
  }

  function swapButton(item, compact) {
    if (U.daysUntil(item.event.date) <= 1) return "";
    return '<button class="btn btn-ghost btn-sm" data-swap="' + esc(item.assignment.id) + '">' + N.icon("swap") + (compact ? "" : " Solicitar troca") + "</button>";
  }

  /* ------------------------------ painel ------------------------------ */
  var dashboard = {
    render: function () {
      var u = me();
      var month = U.monthOf(U.todayISO());
      var count = N.serviceCount(u.id, month);
      var onRest = N.isOnRest(u.id, month);
      var av = N.availabilityFor(u.id, N.state().settings.availabilityMonth);
      var up = upcoming(u.id);
      var pend = pending(u.id);
      var swapsUsed = N.swapRequestsInMonth(u.id, month).filter(function (s) { return s.status !== "rejeitada"; }).length;
      var next = up[0];
      var notices = N.state().notifications.filter(function (n) { return n.audience === "user" && n.userId === u.id; }).slice(0, 4);

      var decisionHtml = pend.length ? pend.map(function (i) {
        return '<div class="decision-card" data-decision="' + esc(i.assignment.id) + '">' +
          '<div class="dc-top"><span class="pulse"></span><span class="badge red plain">Aguardando sua resposta</span></div>' +
          "<h3>" + esc(i.event.name) + "</h3>" +
          '<div class="small muted" style="margin:4px 0 2px">' + esc(U.fmtDateLong(i.event.date)) + " às " + esc(i.event.time) + " · " + esc(N.unitName(i.event.unit)) + "</div>" +
          '<div class="small" style="color:#d6d8dc">Função: <b>' + esc(N.roleName(i.assignment.teamId, i.assignment.roleId)) + "</b></div>" +
          '<div class="btn-group" style="margin-top:12px">' +
            '<button class="btn btn-primary btn-sm" data-confirm="' + esc(i.assignment.id) + '">' + N.icon("check") + " Confirmar presença</button>" +
            '<button class="btn btn-danger btn-sm" data-decline="' + esc(i.assignment.id) + '">' + N.icon("x") + " Recusar presença</button>" +
            swapButton(i) +
          "</div>" +
          '<div class="tiny" style="margin-top:10px;letter-spacing:0;text-transform:none">A resposta é registrada uma única vez e não poderá ser alterada.</div>' +
        "</div>";
      }).join("") : "";

      var nextHtml = next
        ? '<div class="event-card"><div class="event-date"><b>' + esc(next.event.date.slice(8, 10)) + "</b><span>" + esc(N.MONTHS_SHORT[Number(next.event.date.slice(5, 7)) - 1]) + "</span></div>" +
          '<div class="event-info"><h4>' + esc(next.event.name) + "</h4>" +
          '<div class="meta"><span>' + esc(U.fmtDateShort(next.event.date)) + " · " + esc(next.event.time) + "</span><span>" + esc(N.unitName(next.event.unit)) + "</span></div>" +
          '<div class="meta"><span>' + esc(N.roleName(next.assignment.teamId, next.assignment.roleId)) + "</span>" + assignStatusBadge(next.assignment.status) + "</div>" +
          '<div class="btn-group" style="margin-top:10px">' +
            (next.assignment.status === "pendente"
              ? '<button class="btn btn-primary btn-sm" data-confirm="' + esc(next.assignment.id) + '">' + N.icon("check") + " Confirmar</button>" +
                '<button class="btn btn-danger btn-sm" data-decline="' + esc(next.assignment.id) + '">' + N.icon("x") + " Recusar</button>"
              : '<span class="badge ' + (next.assignment.status === "confirmado" ? "green" : "red") + '">' + (next.assignment.status === "confirmado" ? "Presença confirmada" : "Presença recusada") + "</span>") +
            swapButton(next) +
          "</div></div></div>"
        : '<div class="alert info">' + N.icon("calendar") + "<div>Você não possui escalas futuras no momento. Mantenha sua disponibilidade atualizada para ser considerado na próxima montagem.</div></div>";

      var body =
        '<div class="hero-banner"><h1>Paz do Senhor, ' + esc(u.name.split(" ")[0]) + "!</h1>" +
        "<p>Este é o seu painel pessoal. Aqui você acompanha apenas as suas escalas, confirma presença e cuida da sua disponibilidade.</p></div>" +
        decisionHtml +
        '<div class="grid-4" style="margin-bottom:16px">' +
          N.kpi("Serviços no mês", count + "<small style='font-size:12px;color:#8b9097'>/ 3</small>", onRest ? "Folga automática ativa" : "Dentro do limite mensal", true) +
          N.kpi("Minha disponibilidade", av ? av.days.length + " dias" : "Pendente", av ? "Enviada em " + U.fmtDate(av.submittedAt.slice(0, 10)) : "Ainda não enviada") +
          N.kpi("Próxima escala", up.length ? up[0].event.date.slice(8, 10) + "/" + up[0].event.date.slice(5, 7) : "—", up.length ? esc(up[0].event.name) : "Nenhuma escala futura") +
          N.kpi("Trocas no mês", swapsUsed + "<small style='font-size:12px;color:#8b9097'>/ 2</small>", "Limite mensal de solicitações") +
        "</div>" +
        (onRest ? '<div class="alert warn" style="margin-bottom:16px">' + N.icon("clock") + "<div><b>Você está em folga neste mês.</b> Após três serviços, o sistema aplica a folga automaticamente. A liberação é feita exclusivamente pelo administrador.</div></div>" : "") +
        '<div class="grid-2" style="align-items:start">' +
          '<div class="card"><div class="card-title"><h3>Próxima escala</h3><button class="btn-link" data-nav="vol-escalas">Ver todas</button></div>' + nextHtml + "</div>" +
          '<div class="card"><div class="card-title"><h3>Meus avisos</h3><span class="hint">' + notices.length + " recente(s)</span></div>" +
            (notices.length ? notices.map(function (n) {
              return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(n.title) + '</div><div class="li-sub">' + esc(n.text) + '</div></div><div class="li-time">' + esc(U.relative(n.at)) + "</div></div>";
            }).join("") : N.empty("Nenhum aviso", "Você não possui notificações recentes.", "bell")) +
            '<button class="btn btn-ghost btn-block btn-sm" style="margin-top:12px" data-my-notices>Ver todas as notificações</button>' +
          "</div>" +
        "</div>" +
        '<div class="grid-3" style="margin-top:16px">' +
          '<div class="card"><div class="card-title"><h3>Minha disponibilidade</h3></div><p class="small muted" style="margin-top:0">Marque no calendário os dias em que poderá servir. Depois de enviado, o voluntário não pode alterar as datas.</p><button class="btn btn-ghost btn-sm" data-nav="vol-disponibilidade">Abrir calendário</button></div>' +
          '<div class="card"><div class="card-title"><h3>Minhas equipes</h3></div><div class="chip-set">' +
            (u.teamIds.length ? u.teamIds.map(function (id) { return '<span class="chip on">' + esc((N.teamById(id) || {}).name || "") + "</span>"; }).join("") : '<span class="small muted">Nenhuma equipe vinculada.</span>') +
            "</div><p class=\"small muted\" style=\"margin-bottom:0;margin-top:10px\">Funções: " + esc(u.functions.map(function (f) { return N.roleName(f.teamId, f.roleId); }).join(", ") || "—") + "</p></div>" +
          '<div class="card"><div class="card-title"><h3>Manual do voluntário</h3></div><p class="small muted" style="margin-top:0">Consulte o guia atualizado do seu perfil, com opção de baixar em PDF.</p><button class="btn btn-ghost btn-sm" data-nav="vol-manual">Abrir manual</button></div>' +
        "</div>";

      return N.pageHead("Meu painel", "Visão pessoal das suas escalas e do seu compromisso no mês.", "") + body;
    },
    mount: function () {
      var u = me();
      var pend = pending(u.id);
      bindDecisionActions();
      Array.prototype.forEach.call(document.querySelectorAll("[data-my-notices]"), function (b) {
        b.addEventListener("click", openMyNotices);
      });
      if (pend.length && !sessionStorage.getItem("ami_decision_" + u.id)) {
        sessionStorage.setItem("ami_decision_" + u.id, "1");
        openDecisionModal(pend[0]);
      }
    }
  };

  function bindDecisionActions() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-confirm]"), function (b) {
      b.addEventListener("click", function () { decide(b.getAttribute("data-confirm"), "confirmado"); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-decline]"), function (b) {
      b.addEventListener("click", function () {
        N.confirm({
          title: "Recusar presença",
          text: "Ao recusar, a resposta será registrada e não poderá ser alterada. O administrador será avisado e precisará reorganizar a escala. Deseja continuar?",
          confirmLabel: "Recusar presença",
          danger: true,
          onConfirm: function () { decide(b.getAttribute("data-decline"), "recusado"); }
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-swap]"), function (b) {
      b.addEventListener("click", function () { openSwapModal(b.getAttribute("data-swap")); });
    });
  }

  function decide(assignmentId, status) {
    var u = me();
    var found = myAssignments(u.id).find(function (i) { return i.assignment.id === assignmentId; });
    if (!found) return;
    var res = N.respondAssignment(found.schedule.id, assignmentId, status);
    if (!res.ok) { N.toast(res.message, "warn"); return; }
    N.closeModal();
    N.toast(status === "confirmado" ? "Presença confirmada. Obrigado por servir!" : "Presença recusada. O administrador foi avisado.", status === "confirmado" ? "ok" : "warn");
    N.render();
  }

  function openDecisionModal(item) {
    var body =
      '<div class="decision-card" style="margin:0">' +
        '<div class="dc-top"><span class="pulse"></span><span class="badge red plain">Você está escalado(a)</span></div>' +
        "<h3 style='font-size:18px'>" + esc(item.event.name) + "</h3>" +
        '<div class="small muted" style="margin:6px 0 2px">' + esc(U.fmtDateLong(item.event.date)) + " às " + esc(item.event.time) + " · " + esc(N.unitName(item.event.unit)) + "</div>" +
        '<div class="small" style="color:#d6d8dc">Função: <b>' + esc(N.roleName(item.assignment.teamId, item.assignment.roleId)) + "</b></div>" +
      "</div>" +
      '<p class="small muted" style="margin:14px 0 0">Confirme ou recuse sua presença. A resposta é registrada uma única vez e não poderá ser alterada depois.</p>';
    var footer = '<button class="btn btn-ghost" data-close>Depois</button>' +
      '<button class="btn btn-ghost" id="dm-swap">' + N.icon("swap") + " Solicitar troca</button>" +
      '<button class="btn btn-danger" id="dm-decline">Recusar</button>' +
      '<button class="btn btn-primary" id="dm-confirm">' + N.icon("check") + " Confirmar presença</button>";
    N.modal({
      title: "Sua escala", subtitle: "Resposta obrigatória", body: body, footer: footer, wide: false,
      onMount: function (wrap) {
        wrap.querySelector("#dm-confirm").addEventListener("click", function () { decide(item.assignment.id, "confirmado"); });
        wrap.querySelector("#dm-decline").addEventListener("click", function () {
          N.confirm({
            title: "Recusar presença",
            text: "A recusa será registrada e não poderá ser alterada. Deseja continuar?",
            confirmLabel: "Recusar", danger: true,
            onConfirm: function () { decide(item.assignment.id, "recusado"); }
          });
        });
        wrap.querySelector("#dm-swap").addEventListener("click", function () { N.closeModal(); openSwapModal(item.assignment.id); });
      }
    });
  }

  function openMyNotices() {
    var u = me();
    var list = N.state().notifications.filter(function (n) { return n.audience === "user" && n.userId === u.id; });
    N.modal({
      title: "Minhas notificações",
      subtitle: "Avisos sobre as suas escalas, trocas e liberações",
      body: list.length ? list.map(function (n) {
        return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(n.title) + '</div><div class="li-sub">' + esc(n.text) + '</div></div><div class="li-time">' + esc(U.relative(n.at)) + "</div></div>";
      }).join("") : N.empty("Nenhuma notificação", "Quando houver novidades sobre as suas escalas, elas aparecerão aqui.", "bell"),
      footer: '<button class="btn btn-ghost" data-close>Fechar</button>'
    });
  }

  /* ------------------------------ disponibilidade ------------------------------ */
  var availability = {
    month: null,
    selected: [],

    render: function () {
      var u = me();
      var settings = N.state().settings;
      var month = availability.month || settings.availabilityMonth || U.monthOf(U.todayISO());
      availability.month = month;
      var rec = N.availabilityFor(u.id, month);
      availability.selected = rec ? rec.days.slice() : availability.selected.filter(function (d) { return true; });
      if (rec) availability.selected = rec.days.slice();

      var evs = N.state().events.filter(function (e) {
        return e.unit ? u.units.indexOf(e.unit) >= 0 && U.monthOf(e.date) === month : false;
      });
      var evByDay = {};
      evs.forEach(function (e) {
        var d = Number(e.date.slice(8, 10));
        evByDay[d] = evByDay[d] || [];
        evByDay[d].push(e);
      });

      var cells = U.calendarMatrix(month);
      var grid = ['<div class="cal-grid">'];
      ["D", "S", "T", "Q", "Q", "S", "S"].forEach(function (d) { grid.push('<div class="cal-dow">' + d + "</div>"); });
      cells.forEach(function (iso) {
        if (!iso) { grid.push('<div class="cal-day out"></div>'); return; }
        var day = Number(iso.slice(8, 10));
        var hasEvent = !!evByDay[day];
        var marked = availability.selected.indexOf(day) >= 0;
        var cls = "cal-day" + (hasEvent ? " event" : "") + (marked ? " on" : "") + (rec ? " disabled" : "");
        var obs = hasEvent ? evByDay[day].map(function (e) { return e.time; }).filter(function (t, i, arr) { return arr.indexOf(t) === i; }).join(" · ") + " culto" : marked ? "Disponível" : "";
        var label = hasEvent ? evByDay[day].map(function (e) { return e.name + " " + e.time; }).filter(function (t, i, arr) { return arr.indexOf(t) === i; }).join(" / ") : "Dia " + day;
        grid.push('<button type="button" class="' + cls + '" data-day="' + day + '"' + (hasEvent || rec ? " disabled" : "") + ' title="' + esc(label) + '">' +
          '<span class="dnum">' + day + "</span>" + (marked ? '<span class="dot"></span>' : "") +
          '<span class="obs">' + esc(obs) + "</span></button>");
      });
      grid.push("</div>");

      var lockNote = rec
        ? '<div class="alert ok">' + N.icon("check") + "<div><b>Disponibilidade enviada em " + esc(U.fmtDateTime(rec.submittedAt)) + ".</b> As datas não podem mais ser alteradas pelo voluntário. Em caso de necessidade, fale com o administrador.</div></div>"
        : '<div class="alert info">' + N.icon("info") + "<div>Os dias que possuem eventos não podem ser marcados como disponibilidade comum — eles entram automaticamente na sua disponibilidade para a escala. Depois de enviar, as datas ficam bloqueadas.</div></div>";

      var body =
        '<div class="card">' +
          '<div class="cal-head">' +
            '<div class="cal-nav"><button class="btn btn-icon btn-ghost" data-month="-1" aria-label="Mês anterior">' + N.icon("chevronLeft") + "</button>" +
            '<span class="cal-title">' + esc(U.monthLabel(month)) + "</span>" +
            '<button class="btn btn-icon btn-ghost" data-month="1" aria-label="Próximo mês">' + N.icon("chevronRight") + "</button></div>" +
            '<span class="badge ' + (rec ? "green" : "amber") + '">' + (rec ? availability.selected.length + " dias enviados" : "Não enviada") + "</span>" +
          "</div>" +
          grid.join("") +
          '<div class="cal-legend"><span><i class="on"></i>Disponível</span><span><i class="event"></i>Dia com evento (automático)</span><span><i></i>Livre</span></div>' +
          '<div style="margin-top:16px">' + lockNote + "</div>" +
          (rec ? "" :
            '<div class="row-between" style="margin-top:16px"><span class="small muted"><b id="av-count">' + availability.selected.length + "</b> dia(s) selecionado(s) em " + esc(U.monthLabel(month)) + "</span>" +
            '<button class="btn btn-primary" id="save-av">' + N.icon("check") + " Salvar disponibilidade</button></div>") +
        "</div>" +
        '<div class="grid-2" style="margin-top:16px">' +
          '<div class="card"><div class="card-title"><h3>Eventos do mês</h3><span class="hint">' + evs.length + " evento(s)</span></div>" +
            (evs.length ? evs.map(function (e) {
              return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(e.name) + '</div><div class="li-sub">' + esc(U.fmtDateShort(e.date)) + " às " + esc(e.time) + " · " + esc(N.unitName(e.unit, true)) + "</div></div></div>";
            }).join("") : N.empty("Sem eventos", "Não há eventos cadastrados neste mês.", "calendar")) +
          "</div>" +
          '<div class="card"><div class="card-title"><h3>Como funciona</h3></div>' +
            '<ul class="small muted" style="padding-left:18px;line-height:1.8;margin:0">' +
              "<li>Marque os dias em que você poderá servir no mês.</li>" +
              "<li>Dias com culto já cadastrado ficam bloqueados para marcação comum e entram automaticamente na disponibilidade.</li>" +
              "<li>O envio é definitivo: o voluntário não altera as datas depois.</li>" +
              "<li>O administrador consulta todas as respostas e monta as escalas considerando a sua disponibilidade.</li>" +
            "</ul>" +
            (rec ? '<div class="alert info" style="margin-top:14px">' + N.icon("calendar") + "<div>Dias enviados: <b>" + esc(rec.days.join(", ")) + "</b></div></div>" : "") +
          "</div>" +
        "</div>";

      return N.pageHead("Minha disponibilidade", "Calendário mensal para informar os dias em que você poderá servir.", "") + body;
    },

    mount: function () {
      var self = this;
      Array.prototype.forEach.call(document.querySelectorAll("[data-day]"), function (b) {
        b.addEventListener("click", function () {
          var day = Number(b.getAttribute("data-day"));
          var idx = self.selected.indexOf(day);
          if (idx >= 0) { self.selected.splice(idx, 1); b.classList.remove("on"); b.querySelector(".dot") && b.querySelector(".dot").remove(); b.querySelector(".obs").textContent = ""; }
          else {
            self.selected.push(day);
            b.classList.add("on");
            b.insertAdjacentHTML("afterbegin", '<span class="dot"></span>');
            b.querySelector(".obs").textContent = "Disponível";
          }
          self.selected.sort(function (a, b2) { return a - b2; });
          var c = document.getElementById("av-count");
          if (c) c.textContent = self.selected.length;
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-month]"), function (b) {
        b.addEventListener("click", function () {
          self.month = U.addMonths(self.month, Number(b.getAttribute("data-month")));
          self.selected = [];
          N.render();
        });
      });
      var save = document.getElementById("save-av");
      if (save) save.addEventListener("click", function () {
        if (!self.selected.length) { N.toast("Marque ao menos um dia de disponibilidade.", "warn"); return; }
        N.confirm({
          title: "Enviar disponibilidade",
          text: "Você está enviando " + self.selected.length + " dia(s) de " + U.monthLabel(self.month) + ". Após o envio, as datas não poderão ser alteradas. Confirmar envio?",
          confirmLabel: "Enviar disponibilidade",
          onConfirm: function () {
            var res = N.saveAvailability(me().id, self.month, self.selected);
            if (!res.ok) { N.toast(res.message, "warn"); return; }
            N.toast("Disponibilidade enviada com sucesso.", "ok");
            N.render();
          }
        });
      });
    }
  };

  /* ------------------------------ minhas escalas ------------------------------ */
  var myScales = {
    render: function () {
      var u = me();
      var list = myAssignments(u.id);
      var future = list.filter(function (i) { return U.daysUntil(i.event.date) >= 0; });
      var past = list.filter(function (i) { return U.daysUntil(i.event.date) < 0; }).reverse();

      function card(i) {
        var a = i.assignment;
        return '<div class="card" style="margin-bottom:10px"><div class="row-between" style="align-items:flex-start">' +
          '<div><div class="row" style="gap:8px"><h3 style="font-size:14.5px">' + esc(i.event.name) + "</h3>" + assignStatusBadge(a.status) + "</div>" +
          '<div class="small muted" style="margin-top:4px">' + esc(U.fmtDateLong(i.event.date)) + " às " + esc(i.event.time) + " · " + esc(N.unitName(i.event.unit)) + "</div>" +
          '<div class="small" style="color:#d6d8dc;margin-top:2px">Função: <b>' + esc(N.roleName(a.teamId, a.roleId)) + "</b></div>" +
          (a.respondedAt ? '<div class="tiny" style="margin-top:6px;letter-spacing:0;text-transform:none">Respondido em ' + esc(U.fmtDateTime(a.respondedAt)) + "</div>" : "") +
          "</div>" +
          '<div class="btn-group">' +
            (a.status === "pendente"
              ? '<button class="btn btn-primary btn-sm" data-confirm="' + esc(a.id) + '">' + N.icon("check") + " Confirmar</button>" +
                '<button class="btn btn-danger btn-sm" data-decline="' + esc(a.id) + '">' + N.icon("x") + " Recusar</button>"
              : "") +
            swapButton(i) +
          "</div></div></div>";
      }

      return N.pageHead("Eventos e escalas", "Você visualiza somente as informações pertinentes às suas próprias escalas.", "") +
        '<div class="alert info" style="margin-bottom:16px">' + N.icon("info") + "<div>Confirmações e recusas são definitivas. Precisa de troca? O pedido depende exclusivamente da aprovação do administrador e deve ser feito com mais de um dia de antecedência.</div></div>" +
        '<h2 style="font-size:15px;margin:0 0 10px">Próximas escalas <span class="badge gray plain">' + future.length + "</span></h2>" +
        (future.length ? future.map(card).join("") : N.empty("Nenhuma escala futura", "Assim que o administrador montar uma escala com o seu nome, ela aparecerá aqui.", "calendar")) +
        '<h2 style="font-size:15px;margin:26px 0 10px">Histórico recente</h2>' +
        (past.length ? past.slice(0, 8).map(card).join("") : '<p class="small muted">Nenhum serviço registrado.</p>');
    },
    mount: function () { bindDecisionActions(); }
  };

  /* ------------------------------ solicitar troca ------------------------------ */
  var swapPage = {
    render: function () {
      var u = me();
      var eligible = upcoming(u.id).filter(function (i) { return U.daysUntil(i.event.date) > 1; });
      var month = U.monthOf(U.todayISO());
      var mine = N.state().swaps.filter(function (s) { return s.requesterId === u.id; });
      var used = N.swapRequestsInMonth(u.id, month).filter(function (s) { return s.status !== "rejeitada"; }).length;

      return N.pageHead("Solicitar troca", "Toda troca depende de aprovação exclusiva do administrador.", "") +
        '<div class="grid-3" style="margin-bottom:16px">' +
          N.kpi("Solicitações no mês", used + "<small style='font-size:12px;color:#8b9097'>/ 2</small>", "Limite de duas por mês", true) +
          N.kpi("Escalas elegíveis", eligible.length, "Eventos com mais de um dia de antecedência") +
          N.kpi("Pendentes", mine.filter(function (s) { return s.status === "pendente"; }).length, "Aguardando decisão administrativa") +
        "</div>" +
        '<div class="card" style="margin-bottom:16px"><div class="card-title"><h3>Minhas escalas elegíveis</h3><span class="hint">Não é possível solicitar troca faltando um dia para o evento</span></div>' +
        (eligible.length ? eligible.map(function (i) {
          return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(i.event.name) + " · " + esc(U.fmtDateShort(i.event.date)) + " às " + esc(i.event.time) + "</div>" +
            '<div class="li-sub">' + esc(N.roleName(i.assignment.teamId, i.assignment.roleId)) + " · " + esc(N.unitName(i.event.unit)) + " · " + (i.assignment.status === "confirmado" ? "presença confirmada" : i.assignment.status === "pendente" ? "aguardando resposta" : i.assignment.status) + "</div></div>" +
            '<button class="btn btn-ghost btn-sm" data-swap="' + esc(i.assignment.id) + '">' + N.icon("swap") + " Solicitar</button></div>";
        }).join("") : N.empty("Nenhuma escala elegível", "Você não possui escalas futuras que permitam solicitação de troca.", "swap")) +
        "</div>" +
        '<div class="card"><div class="card-title"><h3>Minhas solicitações</h3></div>' +
        (mine.length ? mine.map(function (s) {
          var ev = N.eventById(s.eventId);
          return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(ev ? ev.name : "Evento") + " · " + esc(ev ? U.fmtDate(ev.date) : "") + " " + N.statusBadge(s.status, "swap") + "</div>" +
            '<div class="li-sub">Motivo: ' + esc(s.reason) + (s.suggestedUserId ? " · Sugerido: " + esc(N.userName(s.suggestedUserId)) : " · Sem pessoa sugerida") + (s.adminNote ? " · Observação do administrador: " + esc(s.adminNote) : "") + "</div></div>" +
            '<div class="li-time">' + esc(U.relative(s.createdAt)) + "</div></div>";
        }).join("") : N.empty("Nenhuma solicitação", "Você ainda não solicitou trocas.", "swap")) +
        "</div>";
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-swap]"), function (b) {
        b.addEventListener("click", function () { openSwapModal(b.getAttribute("data-swap")); });
      });
    }
  };

  function openSwapModal(assignmentId) {
    var u = me();
    var found = myAssignments(u.id).find(function (i) { return i.assignment.id === assignmentId; });
    if (!found) { N.toast("Escala não encontrada.", "warn"); return; }
    var ev = found.event;
    if (U.daysUntil(ev.date) <= 1) { N.toast("Não é permitido solicitar troca faltando um dia para o evento.", "warn"); return; }
    var month = U.monthOf(U.todayISO());
    var used = N.swapRequestsInMonth(u.id, month).filter(function (s) { return s.status !== "rejeitada"; }).length;
    if (used >= 2) { N.toast("Limite de duas solicitações de troca por mês atingido.", "warn"); return; }

    var sc = N.scheduleByEvent(ev.id);
    var assignedIds = sc.assignments.filter(function (a) { return a.userId; }).map(function (a) { return a.userId; });
    var candidates = N.state().users.filter(function (x) {
      return x.id !== u.id && x.role !== "admin" && x.status === "ativo" &&
        x.units.indexOf(ev.unit) >= 0 && assignedIds.indexOf(x.id) < 0;
    });

    var body =
      '<div class="alert info" style="margin-bottom:14px">' + N.icon("info") + "<div>" + esc(ev.name) + " · " + esc(U.fmtDateLong(ev.date)) + " às " + esc(ev.time) + " · " + esc(N.roleName(found.assignment.teamId, found.assignment.roleId)) + "</div></div>" +
      '<div class="field" style="margin-bottom:12px"><label>Motivo da troca <span class="req">*</span></label><textarea class="textarea" id="swap-reason" placeholder="Descreva o motivo com clareza para o administrador."></textarea></div>' +
      '<div class="field" style="margin-bottom:12px"><label>Pessoa sugerida (opcional)</label><select class="select" id="swap-person"><option value="">Sem sugestão — deixar a vaga para o administrador</option>' +
        candidates.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + " · " + esc(c.phone) + "</option>"; }).join("") + "</select>" +
        '<span class="help">Pessoas já escaladas neste mesmo evento não aparecem na lista (independentemente de terem confirmado ou recusado).</span></div>' +
      '<div class="alert warn">' + N.icon("alert") + "<div>Solicitações no mês: <b>" + used + " de 2</b>. O administrador receberá uma notificação com todos os detalhes e a troca só ocorre após a aprovação.</div></div>";

    N.modal({
      title: "Solicitar troca",
      subtitle: "A aprovação é exclusiva do administrador",
      body: body,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="swap-send">Enviar solicitação</button>',
      onMount: function (wrap) {
        wrap.querySelector("#swap-send").addEventListener("click", function () {
          var reason = wrap.querySelector("#swap-reason").value;
          var suggested = wrap.querySelector("#swap-person").value || null;
          var res = N.requestSwap({
            eventId: ev.id, assignmentId: assignmentId, userId: u.id,
            reason: reason, suggestedUserId: suggested
          });
          if (!res.ok) { N.toast(res.message, "warn"); return; }
          N.closeModal();
          N.render();
          N.toast("Solicitação enviada. O administrador foi notificado e receberá os detalhes.", "ok");
          openSwapWhatsApp(res.swap, res.admins);
        });
      }
    });
  }

  function openSwapWhatsApp(sw, admins) {
    var ev = N.eventById(sw.eventId);
    var admin = (admins && admins[0]) || null;
    var text = "Solicitação de troca — Agentes do Amor AMI\n\n" +
      "Voluntário: " + N.userName(sw.requesterId) + "\n" +
      "Evento: " + ev.name + "\nData: " + U.fmtDate(ev.date) + " às " + ev.time + "\n" +
      "Função: " + N.roleName(sw.teamId, sw.roleId) + "\nUnidade: " + N.unitName(ev.unit) + "\n" +
      "Motivo: " + sw.reason + "\n" +
      "Pessoa sugerida: " + (sw.suggestedUserId ? N.userName(sw.suggestedUserId) : "não informada") + "\n" +
      "Situação: pendente de aprovação administrativa.";
    N.modal({
      title: "Solicitação registrada",
      subtitle: "Notificação do administrador",
      body: '<p class="small muted" style="margin-top:0">A solicitação foi registrada no sistema. O administrador também recebeu uma notificação interna. Se desejar, envie os detalhes por WhatsApp.</p>' +
        '<pre class="mono" style="white-space:pre-wrap;font-size:11.5px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:10px;padding:12px;color:#c9ccd1;margin:0">' + esc(text) + "</pre>",
      footer: (admin ? '<a class="btn btn-primary" href="' + esc(N.waLink(admin.phone, text)) + '" target="_blank" rel="noopener">' + N.icon("whatsapp") + " Abrir WhatsApp do administrador</a>" : "") +
        '<button class="btn btn-ghost" data-close>Fechar</button>'
    });
  }

  /* ------------------------------ perfil ------------------------------ */
  var profile = {
    render: function () {
      var u = me();
      var days = [];
      var avs = N.state().availability.filter(function (a) { return a.userId === u.id; });
      var consents = N.state().consents.filter(function (c) { return c.userId === u.id; });
      return N.pageHead("Meu perfil", "Dados do seu cadastro no Agentes do Amor AMI.", "") +
        '<div class="grid-2" style="align-items:start">' +
          '<div class="card"><div class="row" style="gap:14px;align-items:center;margin-bottom:16px">' + N.avatarLg(u.name) +
            "<div><h2 style=\"font-size:19px\">" + esc(u.name) + "</h2><div class=\"small muted\">" + esc(N.unitName(u.units[0])) + (u.units.length > 1 ? " e " + esc(N.unitName(u.units[1])) : "") + "</div>" +
            '<div style="margin-top:6px">' + N.roleBadge(u.role) + " " + N.statusBadge(u.status) + "</div></div></div>" +
            '<div class="detail-box" style="border-left:0;padding:0;grid-template-columns:1fr 1fr">' +
              '<div><div class="d-label">E-mail de acesso</div><div class="d-val">' + esc(u.email) + "</div></div>" +
              '<div><div class="d-label">Telefone</div><div class="d-val">' + esc(u.phone) + "</div></div>" +
              '<div><div class="d-label">Condutor(a)</div><div class="d-val">' + esc(u.conductor || "—") + "</div></div>" +
              '<div><div class="d-label">Unidades</div><div class="d-val">' + N.unitBadges(u.units) + "</div></div>" +
              '<div><div class="d-label">Equipes</div><div class="d-val">' + esc(u.teamIds.map(function (id) { return (N.teamById(id) || {}).name || ""; }).join(", ") || "—") + "</div></div>" +
              '<div><div class="d-label">Funções</div><div class="d-val">' + esc(u.functions.map(function (f) { return N.roleName(f.teamId, f.roleId); }).join(", ") || "—") + "</div></div>" +
            "</div>" +
            '<div class="alert info" style="margin-top:16px">' + N.icon("info") + "<div>Para alterar qualquer dado do cadastro, procure um administrador. Somente administradores cadastram, editam e excluem usuários.</div></div>" +
          "</div>" +
          '<div class="stack">' +
            '<div class="card"><div class="card-title"><h3>Meu consentimento LGPD</h3></div>' +
              '<div class="row" style="justify-content:space-between"><span class="small muted">Situação atual</span>' + N.statusBadge(u.lgpd.status === "aceito" ? "aceito" : "pendente_lgpd") + "</div>" +
              '<div class="small muted" style="margin-top:10px">Termo versão <b>' + esc(u.lgpd.version || N.termVersion()) + "</b>" + (u.lgpd.at ? " · registrado em " + esc(U.fmtDateTime(u.lgpd.at)) : "") + ".</div>" +
              (consents.length ? '<div class="stack-sm" style="margin-top:12px">' + consents.slice(0, 4).map(function (c) {
                return '<div class="small" style="color:#c9ccd1">' + (c.status === "aceito" ? "Aceite" : "Recusa") + " · " + esc(U.fmtDateTime(c.at)) + " · versão " + esc(c.version) + "</div>";
              }).join("") + "</div>" : "") +
            "</div>" +
            '<div class="card"><div class="card-title"><h3>Minhas disponibilidades</h3></div>' +
              (avs.length ? avs.map(function (a) {
                return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(U.monthLabel(a.month)) + '</div><div class="li-sub">' + a.days.length + " dias · enviada em " + esc(U.fmtDate(a.submittedAt.slice(0, 10))) + '</div></div><span class="badge green">Bloqueada</span></div>';
              }).join("") : '<p class="small muted">Nenhuma disponibilidade enviada.</p>') +
            "</div>" +
            '<div class="card"><div class="card-title"><h3>Formulário de primeiro acesso</h3></div>' +
              (u.firstAccess && u.firstAccess.done
                ? '<div class="small muted">Enviado em <b>' + esc(U.fmtDateTime(u.firstAccess.at)) + "</b> para o mês de <b>" + esc(U.monthLabel(u.firstAccess.month)) + "</b>. As respostas não podem ser editadas pelo usuário.</div>"
                : '<div class="alert warn">' + N.icon("alert") + "<div>Formulário pendente.</div></div>") +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="card" style="margin-top:16px"><div class="card-title"><h3>Histórico de serviços</h3></div>' +
          (function () {
            var mine = myAssignments(u.id);
            if (!mine.length) return '<p class="small muted">Nenhum serviço registrado.</p>';
            return '<div class="table-wrap"><table class="data"><thead><tr><th>Evento</th><th>Data</th><th>Função</th><th>Resposta</th></tr></thead><tbody>' +
              mine.map(function (i) {
                return "<tr><td>" + esc(i.event.name) + "</td><td>" + esc(U.fmtDate(i.event.date)) + "</td><td>" + esc(N.roleName(i.assignment.teamId, i.assignment.roleId)) + "</td><td>" + N.statusBadge(i.assignment.status, "assignment") + "</td></tr>";
              }).join("") + "</tbody></table></div>";
          })() +
        "</div>";
    },
    mount: function () {}
  };

  N.views = N.views || {};
  N.views["vol-painel"] = dashboard;
  N.views["vol-disponibilidade"] = availability;
  N.views["vol-escalas"] = myScales;
  N.views["vol-troca"] = swapPage;
  N.views["vol-perfil"] = profile;

  N.openSwapModal = openSwapModal;
  N.openMyNotices = openMyNotices;
})(window.AMI);
