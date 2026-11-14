/* Escalas, montagem e integração com WhatsApp */
(function (N) {
  "use strict";
  var U = N.util;
  var esc = N.esc;

  var builder = { eventId: null, slots: [], needs: [] };
  var listState = { unit: "all", view: "futuras" };
  var waState = { mode: "escala", eventId: "", template: "convocacao", unit: "", motivo: "", selected: {} };

  /* ================================ LISTA DE ESCALAS ================================ */
  var list = {
    render: function () {
      var events = N.state().events.filter(function (e) { return N.canSeeUnit(e.unit); })
        .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
      if (listState.unit !== "all") events = events.filter(function (e) { return e.unit === listState.unit; });
      events = events.filter(function (e) {
        return listState.view === "futuras" ? U.daysUntil(e.date) >= 0 : U.daysUntil(e.date) < 0;
      });

      var schedules = N.state().schedules.filter(function (s) { return N.canSeeUnit(s.unit); });
      var assignments = [];
      schedules.forEach(function (s) { assignments = assignments.concat(s.assignments); });
      var filled = assignments.filter(function (a) { return !!a.userId; }).length;
      var open = assignments.filter(function (a) { return !a.userId || a.status === "vaga_aberta"; }).length;
      var confirmed = assignments.filter(function (a) { return a.status === "confirmado"; }).length;

      var body =
        '<div class="grid-4" style="margin-bottom:16px">' +
          N.kpi("Escalas montadas", schedules.length, "Nas unidades da sua abrangência", true) +
          N.kpi("Vagas preenchidas", filled, "Voluntários alocados") +
          N.kpi("Vagas abertas", open, "Precisam de atenção") +
          N.kpi("Confirmações", confirmed, "Presenças confirmadas") +
        "</div>" +
        '<div class="row-between" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
          '<div class="chip-set">' +
            '<button class="chip ' + (listState.unit === "all" ? "on" : "") + '" data-lunit="all">Todas as unidades</button>' +
            N.scopeUnits().map(function (u) {
              return '<button class="chip ' + (listState.unit === u ? "on" : "") + '" data-lunit="' + u + '">' + esc(N.unitName(u, true)) + "</button>";
            }).join("") +
          "</div>" +
          '<div class="chip-set">' +
            '<button class="chip ' + (listState.view === "futuras" ? "on" : "") + '" data-lview="futuras">Próximas</button>' +
            '<button class="chip ' + (listState.view === "anteriores" ? "on" : "") + '" data-lview="anteriores">Anteriores</button>' +
          "</div>" +
        "</div>" +
        (events.length ? events.map(function (e) {
          var sc = N.scheduleByEvent(e.id);
          var total = e.needs.reduce(function (t, n) { return t + Number(n.vagas || 0); }, 0);
          var alloc = sc ? sc.assignments.filter(function (a) { return !!a.userId; }).length : 0;
          return '<div class="card" style="margin-bottom:10px"><div class="row-between" style="align-items:flex-start;gap:12px">' +
            '<div class="row" style="align-items:flex-start;gap:12px"><div class="event-date"><b>' + esc(e.date.slice(8, 10)) + "</b><span>" + esc(N.MONTHS_SHORT[Number(e.date.slice(5, 7)) - 1]) + "</span></div>" +
            '<div><div class="row" style="gap:8px"><h3 style="font-size:14px">' + esc(e.name) + "</h3>" + (sc ? N.statusBadge("montada") : '<span class="badge amber">Não montada</span>') + "</div>" +
            '<div class="small muted" style="margin-top:4px">' + esc(U.fmtDateShort(e.date)) + " às " + esc(e.time) + " · " + esc(N.unitName(e.unit)) + "</div>" +
            '<div class="small muted" style="margin-top:3px">' + alloc + " de " + total + " vagas preenchidas" +
              (sc ? " · " + sc.assignments.filter(function (a) { return a.status === "confirmado"; }).length + " confirmada(s) · " + sc.assignments.filter(function (a) { return a.status === "pendente"; }).length + " pendente(s)" : "") + "</div>" +
            "</div></div>" +
            '<div class="btn-group"><button class="btn btn-ghost btn-sm" data-open="' + esc(e.id) + '">' + (sc ? "Abrir escala" : (N.isAdmin() ? "Montar escala" : "Sem escala")) + "</button></div></div></div>";
        }).join("") : N.empty("Nenhum evento", "Não há eventos para os filtros selecionados.", "calendar"));

      return N.pageHead("Escalas", "Montagem e acompanhamento das escalas por evento, com disponibilidade, folga, unidade e histórico.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-lunit]"), function (b) {
        b.addEventListener("click", function () { listState.unit = b.getAttribute("data-lunit"); N.render(); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-lview]"), function (b) {
        b.addEventListener("click", function () { listState.view = b.getAttribute("data-lview"); N.render(); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-open]"), function (b) {
        b.addEventListener("click", function () { N.navigate("escala-editor", { eventId: b.getAttribute("data-open") }); });
      });
    }
  };

  /* ================================ MONTAGEM ================================ */
  function buildSlots(ev) {
    var existing = N.scheduleByEvent(ev.id);
    var slots = [];
    var used = {};
    ev.needs.forEach(function (need) {
      var matching = existing ? existing.assignments.filter(function (a) { return a.teamId === need.teamId && a.roleId === need.roleId; }) : [];
      matching.forEach(function (a) {
        slots.push(Object.assign({}, a));
        used[a.id] = true;
      });
      for (var i = matching.length; i < Number(need.vagas || 0); i++) {
        slots.push({ id: U.uid("slot"), userId: null, teamId: need.teamId, roleId: need.roleId, status: "vaga_aberta", respondedAt: null, note: "" });
      }
    });
    if (existing) {
      existing.assignments.forEach(function (a) {
        if (!used[a.id]) {
          var known = ev.needs.some(function (n) { return n.teamId === a.teamId && n.roleId === a.roleId; });
          if (!known) slots.push(Object.assign({ extra: true }, a));
        }
      });
    }
    return slots;
  }

  function slotEligibility(ev, user, slot) {
    var reasons = [];
    if (user.id === (slot && slot.userId)) reasons.push("Já alocado nesta vaga");
    if (user.units.indexOf(ev.unit) < 0) reasons.push("Outra unidade");
    if (N.isOnRest(user.id, U.monthOf(ev.date))) reasons.push("Em folga no mês");
    if (N.conflicts(user.id, ev).length) reasons.push("Escalado no mesmo horário");
    var sc = N.scheduleByEvent(ev.id);
    if (sc && sc.assignments.some(function (a) { return a.userId === user.id && (!slot || a.id !== slot.id); })) reasons.push("Já está nesta escala");
    var av = N.isAvailable(user.id, ev);
    if (av === false) reasons.push("Indisponível no dia");
    return { reasons: reasons, blocked: reasons.length > 0, availability: av };
  }

  var editor = {
    render: function (params) {
      var ev = N.eventById(params && params.eventId);
      if (!ev) return N.pageHead("Escala", "Evento não encontrado.", "") + N.empty("Evento não encontrado", "Volte para a lista de escalas.", "alert");
      if (!N.canSeeUnit(ev.unit)) return N.empty("Acesso restrito", "Este evento pertence a outra unidade.", "shield");
      if (builder.eventId !== ev.id) {
        builder.eventId = ev.id;
        builder.slots = buildSlots(ev);
        builder.needs = ev.needs.slice();
      }
      var canEdit = N.isAdmin();
      var slots = builder.slots;
      var total = slots.length;
      var filled = slots.filter(function (s) { return !!s.userId; }).length;
      var month = U.monthOf(ev.date);
      var rests = N.state().users.filter(function (u) {
        return u.units.indexOf(ev.unit) >= 0 && N.isOnRest(u.id, month) && u.role !== "admin";
      });
      var confirmed = slots.filter(function (s) { return s.status === "confirmado"; }).length;

      var groups = ev.needs.map(function (need) {
        var team = N.teamById(need.teamId);
        var role = N.roleOf(need.teamId, need.roleId);
        var groupSlots = slots.filter(function (s) { return !s.extra && s.teamId === need.teamId && s.roleId === need.roleId; });
        return { need: need, team: team, role: role, slots: groupSlots };
      });
      var extras = slots.filter(function (s) { return s.extra; });

      function slotHtml(s, group) {
        if (s.userId) {
          var u = N.userById(s.userId);
          var conflict = N.conflicts(s.userId, ev);
          return '<div class="slot-filled">' + N.avatar(u ? u.name : "?", "") +
            "<div><div style=\"font-weight:600\">" + esc(u ? u.name : "—") + "</div>" +
            '<div class="tiny" style="letter-spacing:0;text-transform:none">' + (u ? esc(u.phone) : "") + (s.status === "confirmado" ? " · presença confirmada" : s.status === "recusado" ? " · presença recusada" : " · aguardando resposta") + "</div>" +
            (conflict.length ? '<div class="tiny" style="color:#f3c078;letter-spacing:0;text-transform:none">Conflito de horário com outro evento</div>' : "") +
            "</div>" +
            '<div class="c-meta" style="margin-left:auto">' + N.statusBadge(s.status, "assignment") +
            (canEdit ? '<button class="btn btn-icon btn-ghost" data-remove-slot="' + esc(s.id) + '" title="Remover da vaga">' + N.icon("x") + "</button>" : "") +
            "</div></div>";
        }
        return '<div class="row-between" style="gap:8px;padding:8px 9px;border:1px dashed rgba(255,255,255,.14);border-radius:8px">' +
          '<span class="small muted">Vaga aberta' + (group ? " · " + esc(group.role ? group.role.name : "") : "") + "</span>" +
          (canEdit ? '<button class="btn btn-ghost btn-sm" data-pick="' + esc(s.id) + '">Escolher voluntário</button>' : '<span class="badge amber">Pendente</span>') + "</div>";
      }

      var body =
        '<div class="row" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
          '<button class="btn btn-ghost btn-sm" data-back>' + N.icon("chevronLeft") + " Voltar para escalas</button>" +
          '<span class="badge gray plain">' + esc(U.fmtDateLong(ev.date)) + " às " + esc(ev.time) + "</span>" +
          '<span class="badge gray plain">' + esc(N.unitName(ev.unit)) + "</span>" +
          (N.scheduleByEvent(ev.id) ? '<span class="badge green">Escala salva</span>' : '<span class="badge amber">Rascunho</span>') +
        "</div>" +
        '<div class="grid-4" style="margin-bottom:16px">' +
          N.kpi("Vagas", total, "Funções necessárias", true) +
          N.kpi("Preenchidas", filled, Math.round((filled / Math.max(total, 1)) * 100) + "% da escala") +
          N.kpi("Confirmadas", confirmed, "Respostas registradas") +
          N.kpi("Em folga", rests.length, "Bloqueados para este mês") +
        "</div>" +
        '<div class="builder-layout">' +
          '<div class="card"><div class="card-title"><h3>Escala do evento</h3>' +
            '<div class="btn-group">' + (canEdit ? '<button class="btn btn-ghost btn-sm" id="clear-scale">Limpar</button><button class="btn btn-primary btn-sm" id="save-scale">' + N.icon("check") + " Salvar escala</button>" : "") + "</div></div>" +
            groups.map(function (g) {
              return '<div style="margin-bottom:16px"><div class="row-between" style="margin-bottom:7px"><div class="row" style="gap:7px"><b style="font-size:13px">' + esc(g.team ? g.team.name : "Equipe") + '</b><span class="tag">' + esc(g.role ? g.role.name : "") + "</span></div>" +
                '<span class="tiny">' + g.slots.filter(function (s) { return !!s.userId; }).length + " / " + g.slots.length + " vagas</span></div>" +
                (g.slots.length ? g.slots.map(function (s) { return slotHtml(s, g); }).join("") : '<div class="slot-empty">Nenhuma vaga gerada</div>') +
                (canEdit ? '<button class="btn btn-link" style="margin-top:6px" data-add-slot="' + esc(g.need.teamId) + "|" + esc(g.need.roleId) + '">+ Adicionar vaga extra</button>' : "") +
                "</div>";
            }).join("") +
            (extras.length ? '<div class="divider"></div><h3 style="font-size:13px;margin-bottom:8px">Outras alocações</h3>' + extras.map(function (s) { return slotHtml(s, null); }).join("") : "") +
          "</div>" +
          '<div class="stack">' +
            '<div class="card"><div class="card-title"><h3>Critérios considerados</h3></div>' +
              '<ul class="small muted" style="padding-left:18px;margin:0;line-height:1.8">' +
                "<li>Disponibilidade informada para o mês do evento</li>" +
                "<li>Folga automática após três serviços</li>" +
                "<li>Unidade de cadastro do voluntário</li>" +
                "<li>Histórico: quantas vezes cada pessoa já serviu</li>" +
                "<li>Impede a mesma pessoa em dois eventos no mesmo horário, inclusive entre unidades</li>" +
              "</ul></div>" +
            '<div class="card"><div class="card-title"><h3>Folgas do mês</h3><span class="hint">' + esc(U.monthLabel(month, { short: true })) + "</span></div>" +
              (rests.length ? rests.map(function (u) {
                return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(u.name) + '</div><div class="li-sub">' + N.serviceCount(u.id, month) + " serviços no mês</div></div>" +
                  (N.isAdmin() ? '<button class="btn btn-ghost btn-sm" data-release="' + esc(u.id) + '">Liberar</button>' : N.statusBadge("folga")) + "</div>";
              }).join("") : '<p class="small muted" style="margin:0">Nenhum voluntário em folga neste mês.</p>') +
            "</div>" +
            '<div class="card"><div class="card-title"><h3>Avisos</h3></div>' +
              '<p class="small muted" style="margin:0">Ao salvar, o sistema atualiza a folga automática e registra a alteração no histórico com os dados anteriores e posteriores. A escala pode ser editada mesmo depois de montada.</p></div>' +
          "</div>" +
        "</div>";

      return N.pageHead((N.scheduleByEvent(ev.id) ? "Editar escala" : "Montar escala") + " · " + ev.name,
        "Selecione os voluntários para cada função. A disponibilidade, a folga, a unidade e o histórico são considerados.", "") + body;
    },

    mount: function (params) {
      var ev = N.eventById(params && params.eventId);
      if (!ev) return;
      Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (b) {
        b.addEventListener("click", function () { N.navigate("escalas"); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-pick]"), function (b) {
        b.addEventListener("click", function () { openCandidates(ev, b.getAttribute("data-pick")); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-remove-slot]"), function (b) {
        b.addEventListener("click", function () {
          var s = builder.slots.find(function (x) { return x.id === b.getAttribute("data-remove-slot"); });
          if (!s) return;
          s.userId = null; s.status = "vaga_aberta"; s.respondedAt = null;
          N.render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-add-slot]"), function (b) {
        b.addEventListener("click", function () {
          var parts = b.getAttribute("data-add-slot").split("|");
          builder.slots.push({ id: U.uid("slot"), userId: null, teamId: parts[0], roleId: parts[1], status: "vaga_aberta", respondedAt: null, note: "" });
          N.render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-release]"), function (b) {
        b.addEventListener("click", function () {
          var uid = b.getAttribute("data-release");
          N.confirm({
            title: "Liberar folga",
            text: "Liberar " + N.userName(uid) + " da folga de " + U.monthLabel(U.monthOf(ev.date)) + "? A liberação será registrada no histórico.",
            confirmLabel: "Liberar folga",
            onConfirm: function () {
              N.releaseRest(uid, U.monthOf(ev.date));
              N.persist();
              N.toast("Folga liberada e registrada no histórico.", "ok");
              N.render();
            }
          });
        });
      });
      var save = document.getElementById("save-scale");
      if (save) save.addEventListener("click", function () {
        var unfilled = builder.slots.filter(function (s) { return !s.userId; }).length;
        N.confirm({
          title: "Salvar escala",
          text: unfilled ? "Ainda há " + unfilled + " vaga(s) aberta(s). Deseja salvar mesmo assim?" : "Salvar a escala com " + builder.slots.filter(function (s) { return !!s.userId; }).length + " voluntário(s)?",
          confirmLabel: "Salvar escala",
          onConfirm: function () {
            var res = N.saveSchedule(ev.id, builder.slots);
            if (!res.ok) { N.toast(res.message, "warn"); return; }
            N.toast("Escala salva. Folgas e histórico atualizados.", "ok");
            N.render();
          }
        });
      });
      var clear = document.getElementById("clear-scale");
      if (clear) clear.addEventListener("click", function () {
        N.confirm({
          title: "Limpar escala",
          text: "Remover todos os voluntários desta escala? As vagas ficarão abertas até você salvar novamente.",
          confirmLabel: "Limpar", danger: true,
          onConfirm: function () {
            builder.slots.forEach(function (s) { s.userId = null; s.status = "vaga_aberta"; s.respondedAt = null; });
            N.render();
          }
        });
      });
    }
  };

  function openCandidates(ev, slotId) {
    var slot = builder.slots.find(function (s) { return s.id === slotId; });
    if (!slot) return;
    var month = U.monthOf(ev.date);
    var users = N.state().users.filter(function (u) { return u.role !== "admin" && u.status === "ativo"; })
      .filter(function (u) { return u.units.indexOf(ev.unit) >= 0; })
      .map(function (u) {
        var el = slotEligibility(ev, u, slot);
        var hasFn = u.functions.some(function (f) { return f.teamId === slot.teamId && f.roleId === slot.roleId; });
        var cert = u.functions.some(function (f) { return f.teamId === slot.teamId; });
        return { user: u, el: el, hasFn: hasFn, cert: cert, services: N.serviceCount(u.id, month) };
      })
      .sort(function (a, b) {
        if (a.el.blocked !== b.el.blocked) return a.el.blocked ? 1 : -1;
        if (a.hasFn !== b.hasFn) return a.hasFn ? -1 : 1;
        if (a.services !== b.services) return a.services - b.services;
        return a.user.name.localeCompare(b.user.name, "pt-BR");
      });

    var body = '<div class="alert info" style="margin-bottom:12px">' + N.icon("info") + "<div>" + esc(N.roleName(slot.teamId, slot.roleId)) + " · " + esc(U.fmtDate(ev.date)) + " às " + esc(ev.time) + " · " + esc(N.unitName(ev.unit)) + "</div></div>" +
      '<div class="candidate-panel">' + (users.length ? users.map(function (c) {
        var avLabel = c.el.availability === true ? "Disponível" : c.el.availability === false ? "Indisponível" : "Sem resposta";
        var avClass = c.el.availability === true ? "green" : c.el.availability === false ? "red" : "gray";
        return '<button class="candidate" ' + (c.el.blocked ? "disabled" : "") + ' data-assign="' + esc(c.user.id) + '">' + N.avatar(c.user.name) +
          "<div><div style=\"font-weight:600\">" + esc(c.user.name) + "</div>" +
          '<div class="tiny" style="letter-spacing:0;text-transform:none">' + c.services + " serviço(s) no mês · " + esc(c.user.units.map(function (x) { return N.unitName(x, true); }).join("/")) + "</div></div>" +
          '<div class="c-meta">' + (c.hasFn ? '<span class="badge green plain">função</span>' : c.cert ? '<span class="badge blue plain">equipe</span>' : "") +
          '<span class="badge ' + avClass + '">' + avLabel + "</span>" +
          (c.el.blocked ? '<span class="badge red">' + esc(c.el.reasons[0]) + "</span>" : "") + "</div></button>";
      }).join("") : N.empty("Nenhum voluntário", "Não há voluntários ativos nesta unidade.", "users")) + "</div>";

    N.modal({
      title: "Selecionar voluntário",
      subtitle: "Elegibilidade calculada por unidade, disponibilidade, folga, conflito e histórico",
      body: body, wide: true,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button>',
      onMount: function (wrap) {
        Array.prototype.forEach.call(wrap.querySelectorAll("[data-assign]"), function (b) {
          b.addEventListener("click", function () {
            var userId = b.getAttribute("data-assign");
            var el = slotEligibility(ev, N.userById(userId), slot);
            if (el.blocked) { N.toast("Voluntário indisponível: " + el.reasons[0] + ".", "warn"); return; }
            slot.userId = userId;
            slot.status = "pendente";
            slot.respondedAt = null;
            N.closeModal();
            N.render();
          });
        });
      }
    });
  }

  /* ================================ WHATSAPP ================================ */
  var whatsapp = {
    render: function () {
      var events = N.state().events.filter(function (e) { return N.canSeeUnit(e.unit) && U.daysUntil(e.date) >= 0; });
      if (!waState.eventId && events.length) waState.eventId = events[0].id;
      if (!waState.unit) waState.unit = N.scopeUnits()[0];
      var recipients = getRecipients();
      var templates = [
        { id: "convocacao", label: "Convocação para escala" },
        { id: "lembrete", label: "Lembrete na véspera" },
        { id: "confirmacao", label: "Confirmação de presença" },
        { id: "troca_solicitada", label: "Solicitação de troca" },
        { id: "troca_aprovada", label: "Aprovação de troca" },
        { id: "troca_rejeitada", label: "Rejeição de troca" },
        { id: "comunicado", label: "Comunicado geral" }
      ];
      var ev = N.eventById(waState.eventId);
      var scopeEvent = waState.mode === "escala" ? ev : null;
      var scopeUnit = waState.mode === "escala" ? (ev ? ev.unit : waState.unit) : waState.unit;
      var preview = recipients[0] ? N.templateBody(waState.template, {
        name: recipients[0].name.split(" ")[0], event: scopeEvent, unit: N.unitName(scopeUnit),
        role: recipients[0].role || "—", motivo: waState.motivo || "—"
      }) : "Selecione os destinatários para visualizar a mensagem.";

      var body =
        '<div class="grid-2" style="align-items:start">' +
          '<div class="stack">' +
            '<div class="card"><div class="card-title"><h3>Destinatários</h3></div>' +
              '<div class="chip-set" style="margin-bottom:14px">' +
                '<button class="chip ' + (waState.mode === "escala" ? "on" : "") + '" data-wmode="escala">Voluntários de uma escala</button>' +
                '<button class="chip ' + (waState.mode === "pessoas" ? "on" : "") + '" data-wmode="pessoas">Pessoas selecionadas</button>' +
                '<button class="chip ' + (waState.mode === "unidade" ? "on" : "") + '" data-wmode="unidade">Todos de uma unidade</button>' +
              "</div>" +
              (waState.mode === "escala"
                ? '<div class="field" style="margin-bottom:12px"><label>Escala / evento</label><select class="select" id="w-event">' +
                  N.options(events.map(function (e) { return { value: e.id, label: e.name + " · " + U.fmtDate(e.date) + " · " + N.unitName(e.unit, true) }; }), waState.eventId) + "</select></div>"
                : waState.mode === "unidade"
                  ? '<div class="field" style="margin-bottom:12px"><label>Unidade</label><select class="select" id="w-unit">' + unitSelect() + "</select></div>"
                  : "") +
              '<div class="field" style="margin-bottom:12px"><label>Modelo de mensagem</label><select class="select" id="w-template">' + N.options(templates, waState.template) + "</select></div>" +
              (waState.template === "comunicado" || waState.template === "troca_solicitada"
                ? '<div class="field" style="margin-bottom:12px"><label>' + (waState.template === "comunicado" ? "Texto do comunicado" : "Motivo da troca") + '</label><textarea class="textarea" id="w-motivo" placeholder="' + (waState.template === "comunicado" ? "Escreva o comunicado que será enviado." : "Descreva o motivo da troca.") + '">' + esc(waState.motivo) + "</textarea></div>"
                : "") +
              (waState.mode === "pessoas" ? '<div class="small muted" style="margin-bottom:6px">Marque as pessoas que receberão a mensagem:</div><div style="max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px">' +
                N.state().users.filter(function (u) { return u.role !== "admin" && N.canSeeUnit(u.units[0]); }).map(function (u) {
                  var on = !!waState.selected[u.id];
                  return '<label class="check" style="padding:6px 4px"><input type="checkbox" data-recipient="' + esc(u.id) + '"' + (on ? " checked" : "") + " /> <span>" + esc(u.name) + " <span class=\"muted\">· " + esc(u.phone) + "</span></span></label>";
                }).join("") + "</div>" : "") +
              '<div class="alert warn" style="margin-top:12px">' + N.icon("alert") + "<div>As mensagens de uma escala são preparadas em <b>uma única operação</b> para todos os selecionados. Links wa.me abrem conversas individuais; para envio automático e coletivo é necessária a API oficial do WhatsApp Business ou provedor compatível.</div></div>" +
            "</div>" +
            '<div class="card"><div class="card-title"><h3>Pré-visualização</h3><span class="hint">' + recipients.length + " destinatário(s)</span></div>" +
              '<pre class="mono" style="white-space:pre-wrap;font-size:11.5px;color:#c9ccd1;margin:0">' + esc(preview) + "</pre>" +
              '<div class="btn-group" style="margin-top:14px"><button class="btn btn-primary" id="w-prepare">' + N.icon("whatsapp") + " Preparar e enviar (" + recipients.length + ")</button></div>" +
            "</div>" +
          "</div>" +
          '<div class="card"><div class="card-title"><h3>Destinatários selecionados</h3></div>' +
            (recipients.length ? recipients.map(function (r) {
              return '<div class="list-item">' + N.avatar(r.name) + '<div class="li-body"><div class="li-title">' + esc(r.name) + '</div><div class="li-sub">' + esc(r.phone) + (r.role ? " · " + esc(r.role) : "") + "</div></div>" +
                '<a class="btn btn-icon btn-ghost" href="' + esc(N.waLink(r.phone, N.templateBody(waState.template, { name: r.name.split(" ")[0], event: scopeEvent, unit: N.unitName(scopeUnit), role: r.role, motivo: waState.motivo || "—" }))) + '" target="_blank" rel="noopener" title="Abrir conversa">' + N.icon("external") + "</a></div>";
            }).join("") : N.empty("Nenhum destinatário", "Ajuste o modo de envio ou selecione pessoas.", "whatsapp")) +
          "</div>" +
        "</div>" +
        '<div class="card" style="margin-top:16px"><div class="card-title"><h3>Envios preparados</h3><span class="hint">' + N.state().messages.length + " registro(s)</span></div>" +
          (N.state().messages.length ? N.state().messages.slice(0, 8).map(function (m) {
            return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(m.template) + " · " + m.count + " destinatário(s)</div><div class=\"li-sub\">" + esc((m.recipients || []).join(", ")) + "</div></div><div class=\"li-time\">" + esc(U.relative(m.at)) + "</div></div>";
          }).join("") : '<p class="small muted">Nenhuma mensagem preparada ainda.</p>') +
        "</div>";

      return N.pageHead("WhatsApp", "Convocação, lembretes, confirmações e comunicados em uma única operação.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-wmode]"), function (b) {
        b.addEventListener("click", function () {
          var mode = b.getAttribute("data-wmode");
          waState.mode = mode;
          var scaleTemplates = ["convocacao", "lembrete", "confirmacao"];
          if (mode !== "escala" && scaleTemplates.indexOf(waState.template) >= 0) waState.template = "comunicado";
          if (mode === "escala" && waState.template === "comunicado") waState.template = "convocacao";
          N.render();
        });
      });
      var evSel = document.getElementById("w-event");
      if (evSel) evSel.addEventListener("change", function () { waState.eventId = evSel.value; N.render(); });
      var uSel = document.getElementById("w-unit");
      if (uSel) uSel.addEventListener("change", function () { waState.unit = uSel.value; N.render(); });
      var tSel = document.getElementById("w-template");
      tSel.addEventListener("change", function () { waState.template = tSel.value; N.render(); });
      var motivo = document.getElementById("w-motivo");
      if (motivo) motivo.addEventListener("input", function () { waState.motivo = motivo.value; });
      Array.prototype.forEach.call(document.querySelectorAll("[data-recipient]"), function (cb) {
        cb.addEventListener("change", function () {
          waState.selected[cb.getAttribute("data-recipient")] = cb.checked;
          N.render();
        });
      });
      document.getElementById("w-prepare").addEventListener("click", function () {
        var recipients = getRecipients();
        if (!recipients.length) { N.toast("Selecione ao menos um destinatário.", "warn"); return; }
        if (!recipients.every(function (r) { return U.digits(r.phone).length >= 10; })) { N.toast("Há destinatários sem telefone válido.", "warn"); return; }
        if ((waState.template === "comunicado" || waState.template === "troca_solicitada") && !waState.motivo.trim()) {
          N.toast(waState.template === "comunicado" ? "Escreva o texto do comunicado." : "Descreva o motivo da troca.", "warn");
          return;
        }
        var ev = N.eventById(waState.eventId);
        var scopeEvent = waState.mode === "escala" ? ev : null;
        var scopeUnit = waState.mode === "escala" ? (ev ? ev.unit : waState.unit) : waState.unit;
        var links = recipients.map(function (r) {
          var text = N.templateBody(waState.template, {
            name: r.name.split(" ")[0], event: scopeEvent, unit: N.unitName(scopeUnit),
            role: r.role || "—", motivo: waState.motivo || "—"
          });
          return { name: r.name, phone: r.phone, text: text, link: N.waLink(r.phone, text) };
        });
        N.registerMessages(waState.template, recipients, scopeUnit);
        N.modal({
          title: "Mensagens prontas",
          subtitle: links.length + " conversa(s) preparada(s) em uma única operação",
          wide: true,
          body: '<div class="alert info" style="margin-bottom:12px">' + N.icon("whatsapp") + "<div>Abra cada conversa para revisar e enviar. Se o navegador bloquear as janelas, use os botões individuais abaixo.</div></div>" +
            links.map(function (l) {
              return '<div class="list-item">' + N.avatar(l.name) + '<div class="li-body"><div class="li-title">' + esc(l.name) + '</div><div class="li-sub">' + esc(l.phone) + "</div></div>" +
              '<a class="btn btn-primary btn-sm" href="' + esc(l.link) + '" target="_blank" rel="noopener">Abrir conversa</a></div>';
            }).join(""),
          footer: '<button class="btn btn-ghost" data-close>Fechar</button><button class="btn btn-primary" id="open-all">Abrir todas as conversas</button>',
          onMount: function (wrap) {
            wrap.querySelector("#open-all").addEventListener("click", function () {
              links.forEach(function (l, i) {
                setTimeout(function () { window.open(l.link, "_blank", "noopener"); }, i * 350);
              });
              N.toast("Abrindo " + links.length + " conversa(s). Verifique o bloqueio de pop-ups.", "ok");
            });
          }
        });
      });
    }
  };

  function unitSelect() {
    return N.options(N.scopeUnits().map(function (u) { return { value: u, label: N.unitName(u) }; }), waState.unit);
  }

  function getRecipients() {
    var out = [];
    var seen = {};
    if (waState.mode === "escala") {
      var ev = N.eventById(waState.eventId);
      if (!ev) return [];
      var sc = N.scheduleByEvent(ev.id);
      if (!sc) return [];
      sc.assignments.forEach(function (a) {
        if (!a.userId || seen[a.userId]) return;
        var u = N.userById(a.userId);
        if (!u) return;
        seen[a.userId] = true;
        out.push({ id: u.id, name: u.name, phone: u.phone, role: N.roleName(a.teamId, a.roleId), status: a.status });
      });
      return out;
    }
    if (waState.mode === "unidade") {
      return N.state().users.filter(function (u) {
        return u.role !== "admin" && u.status === "ativo" && u.units.indexOf(waState.unit) >= 0;
      }).map(function (u) { return { id: u.id, name: u.name, phone: u.phone, role: "" }; });
    }
    return N.state().users.filter(function (u) { return !!waState.selected[u.id] && u.status === "ativo"; })
      .map(function (u) { return { id: u.id, name: u.name, phone: u.phone, role: "" }; });
  }

  N.views["escalas"] = list;
  N.views["escala-editor"] = editor;
  N.views["whatsapp"] = whatsapp;
  N.schedulesUi = { builder: builder, listState: listState, waState: waState };
})(window.AMI);
