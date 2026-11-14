/* Área administrativa: usuários, equipes, eventos, disponibilidades, trocas e histórico */
(function (N) {
  "use strict";
  var U = N.util;
  var esc = N.esc;

  var uiState = {
    usersTab: "todos",
    usersQuery: "",
    volunteerQuery: "",
    availMonth: null,
    historyQuery: "",
    notifFilter: "todas"
  };

  function can(perm) { return N.isAdmin() || N.hasPermission(perm); }
  function scopedUsers() {
    return N.state().users.filter(function (u) {
      return u.units.some(function (x) { return N.canSeeUnit(x); });
    });
  }
  function scopedTeams() {
    return N.state().teams.filter(function (t) { return N.canSeeUnit(t.unit); });
  }
  function scopedEvents() {
    return N.state().events.filter(function (e) { return N.canSeeUnit(e.unit); });
  }
  function scopedSchedules() {
    return N.state().schedules.filter(function (s) { return N.canSeeUnit(s.unit); });
  }
  function scopedNotifications() {
    return N.state().notifications.filter(function (n) {
      if (n.audience === "admin") return !n.unit || N.canSeeUnit(n.unit);
      return false;
    });
  }
  function scopedSwaps() {
    return N.state().swaps.filter(function (s) { return N.canSeeUnit(s.unit); });
  }

  function unitOptions(selected) {
    return N.options(N.scopeUnits().map(function (id) {
      return { value: id, label: N.unitName(id) };
    }), selected);
  }

  function editableUnits() {
    var me = N.currentUser();
    if (me.role === "admin" && me.units.indexOf("pacheco") >= 0) return ["pacheco", "amendoeira"];
    return N.scopeUnits();
  }

  function editableTeams() {
    var units = editableUnits();
    return N.state().teams.filter(function (t) { return units.indexOf(t.unit) >= 0; });
  }

  function monthSelect(id, selected, months) {
    var base = N.state().settings.availabilityMonth || U.monthOf(U.todayISO());
    var list = [];
    for (var i = -3; i <= 6; i++) list.push(N.util.addMonths(base, i));
    if (list.indexOf(selected) < 0) list.push(selected);
    return '<select class="select" id="' + esc(id) + '">' + N.options(list.map(function (m) { return { value: m, label: U.monthLabel(m) }; }), selected) + "</select>";
  }

  function firstAccessMonth(u) {
    return u.firstAccess && u.firstAccess.month ? U.monthLabel(u.firstAccess.month) : "—";
  }

  /* ================================ PAINEL ================================ */
  var panel = {
    render: function () {
      var users = scopedUsers();
      var volunteers = users.filter(function (u) { return u.role === "voluntario"; });
      var dirigentes = users.filter(function (u) { return u.role === "dirigente"; });
      var events = scopedEvents().filter(function (e) { return U.daysUntil(e.date) >= 0; });
      var schedules = scopedSchedules();
      var assignments = [];
      schedules.forEach(function (s) { assignments = assignments.concat(s.assignments); });
      var confirmed = assignments.filter(function (a) { return a.status === "confirmado"; }).length;
      var refused = assignments.filter(function (a) { return a.status === "recusado"; }).length;
      var waiting = assignments.filter(function (a) { return a.status === "pendente"; }).length;
      var open = assignments.filter(function (a) { return a.status === "vaga_aberta" || !a.userId; }).length;
      var pendingSwaps = scopedSwaps().filter(function (s) { return s.status === "pendente"; });
      var month = U.monthOf(U.todayISO());
      var onRest = N.state().rests.filter(function (r) {
        var u = N.userById(r.userId);
        return r.status === "folga" && r.month === month && u && u.units.some(function (x) { return N.canSeeUnit(x); });
      });
      var avail = N.state().availability.filter(function (a) {
        var u = N.userById(a.userId);
        return a.month === N.state().settings.availabilityMonth && u && u.units.some(function (x) { return N.canSeeUnit(x); });
      });
      var forms = users.filter(function (u) { return u.firstAccess && u.firstAccess.done; }).length;
      var notifs = scopedNotifications();
      var unread = notifs.filter(function (n) { return (n.readBy || []).indexOf(N.currentUser().id) < 0; });
      var nextEvents = events.slice(0, 4);

      var body =
        '<div class="hero-banner"><div class="row-between" style="align-items:flex-start">' +
          "<div><h1>Painel administrativo</h1><p>Unidades integradas, permissões respeitadas e uma visão completa do voluntariado. " + esc(U.fmtDateLong(U.todayISO())) + ".</p></div>" +
          '<div class="badge ' + (unread.length ? "red" : "green") + ' plain" style="font-size:11.5px">' + (unread.length ? unread.length + " aviso(s) não lido(s)" : "Tudo em dia") + "</div>" +
        "</div></div>" +

        '<div class="grid-4" style="margin-bottom:14px">' +
          N.kpi("Voluntários", volunteers.length, dirigentes.length + " dirigente(s) na abrangência", true) +
          N.kpi("Equipes", scopedTeams().length, "Funções e vagas configuradas") +
          N.kpi("Eventos futuros", events.length, scopedSchedules().length + " escala(s) montada(s)") +
          N.kpi("Trocas aguardando", pendingSwaps.length, pendingSwaps.length ? "Requer aprovação" : "Nenhuma pendência", pendingSwaps.length > 0) +
        "</div>" +
        '<div class="grid-4" style="margin-bottom:18px">' +
          N.kpi("Confirmações", confirmed, "Presenças confirmadas") +
          N.kpi("Recusas", refused, "Presenças recusadas") +
          N.kpi("Aguardando resposta", waiting, "Voluntários convocados") +
          N.kpi("Vagas abertas", open, "Escalas incompletas") +
        "</div>" +
        '<div class="grid-4" style="margin-bottom:18px">' +
          N.kpi("Em folga", onRest.length, "Liberação exclusiva do administrador") +
          N.kpi("Disponibilidades", avail.length, "Respostas de " + U.monthLabel(N.state().settings.availabilityMonth, { short: true })) +
          N.kpi("Formulários recebidos", forms, "Primeiro acesso concluído") +
          N.kpi("Notificações", unread.length, "Avisos ao administrador") +
        "</div>" +

        '<div class="grid-2" style="align-items:start">' +
          '<div class="card"><div class="card-title"><h3>Próximos eventos</h3><button class="btn-link" data-nav="eventos">Gerenciar eventos</button></div>' +
            (nextEvents.length ? nextEvents.map(function (e) {
              var sc = N.scheduleByEvent(e.id);
              var filled = sc ? sc.assignments.filter(function (a) { return !!a.userId; }).length : 0;
              var total = sc ? sc.assignments.length : e.needs.reduce(function (t, n) { return t + n.vagas; }, 0);
              return '<div class="event-card" style="margin-bottom:9px">' +
                '<div class="event-date"><b>' + esc(e.date.slice(8, 10)) + "</b><span>" + esc(N.MONTHS_SHORT[Number(e.date.slice(5, 7)) - 1]) + "</span></div>" +
                '<div class="event-info"><h4>' + esc(e.name) + "</h4>" +
                '<div class="meta"><span>' + esc(U.fmtDateShort(e.date)) + " · " + esc(e.time) + "</span><span>" + esc(N.unitName(e.unit)) + "</span></div>" +
                '<div class="meta"><span>' + filled + " de " + total + " vagas preenchidas</span>" + (sc ? N.statusBadge("montada") : '<span class="badge amber">Escala pendente</span>') + "</div>" +
                '<button class="btn btn-ghost btn-sm" style="margin-top:8px" data-schedule="' + esc(e.id) + '">' + (sc ? "Editar escala" : "Montar escala") + "</button></div></div>";
            }).join("") : N.empty("Sem eventos futuros", "Cadastre eventos para montar as escalas.", "calendar")) +
          "</div>" +
          '<div class="stack">' +
            '<div class="card"><div class="card-title"><h3>Precisa de atenção</h3></div>' +
              (pendingSwaps.length ? pendingSwaps.slice(0, 3).map(function (s) {
                var ev = N.eventById(s.eventId);
                return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(N.userName(s.requesterId)) + " pediu troca</div>" +
                  '<div class="li-sub">' + esc(ev ? ev.name + " · " + U.fmtDate(ev.date) : "") + " · " + esc(s.reason) + '</div></div><button class="btn btn-primary btn-sm" data-swaps>Analisar</button></div>';
              }).join("") : "") +
              users.filter(function (u) { return u.status === "pendente"; }).slice(0, 3).map(function (u) {
                return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(u.name) + '</div><div class="li-sub">Aguardando o primeiro login · ' + esc(u.email) + '</div></div><span class="badge amber">Pendente</span></div>';
              }).join("") +
              users.filter(function (u) { return u.status === "bloqueado"; }).slice(0, 3).map(function (u) {
                return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(u.name) + '</div><div class="li-sub">' + esc(u.blockedReason || "Acesso bloqueado") + '</div></div><span class="badge red">Bloqueado</span></div>';
              }).join("") +
              (onRest.length ? '<div class="alert warn" style="margin-top:10px">' + N.icon("clock") + "<div><b>" + onRest.length + " voluntário(s) em folga</b> neste mês. A liberação é exclusiva do administrador.</div></div>" : "") +
              (!pendingSwaps.length && !users.some(function (u) { return u.status !== "ativo"; }) && !onRest.length
                ? '<div class="alert ok">' + N.icon("check") + "<div>Nenhuma pendência administrativa no momento.</div></div>" : "") +
            "</div>" +
            '<div class="card"><div class="card-title"><h3>Avisos recentes</h3><button class="btn-link" data-nav="notificacoes">Ver todos</button></div>' +
              (unread.length ? unread.slice(0, 5).map(function (n) {
                return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(n.title) + '</div><div class="li-sub">' + esc(n.text) + '</div></div><div class="li-time">' + esc(U.relative(n.at)) + "</div></div>";
              }).join("") : N.empty("Sem avisos", "Os avisos administrativos aparecerão aqui.", "bell")) +
            "</div>" +
          "</div>" +
        "</div>";

      return N.pageHead("Painel", "Indicadores administrativos da sua abrangência de unidades.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-schedule]"), function (b) {
        b.addEventListener("click", function () { N.navigate("escala-editor", { eventId: b.getAttribute("data-schedule") }); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-swaps]"), function (b) {
        b.addEventListener("click", function () { N.navigate("trocas"); });
      });
    }
  };

  /* ================================ USUÁRIOS ================================ */
  function userDetail(u) {
    var teamNames = u.teamIds.map(function (id) { return (N.teamById(id) || {}).name; }).filter(Boolean).join(", ");
    var funcs = u.functions.map(function (f) { return N.roleName(f.teamId, f.roleId); }).filter(Boolean).join(", ");
    return '<div class="detail-box">' +
      '<div><div class="d-label">E-mail de acesso</div><div class="d-val">' + esc(u.email) + "</div></div>" +
      '<div><div class="d-label">Telefone / WhatsApp</div><div class="d-val">' + esc(u.phone) + "</div></div>" +
      '<div><div class="d-label">Unidade(s)</div><div class="d-val">' + N.unitBadges(u.units) + "</div></div>" +
      '<div><div class="d-label">Equipes</div><div class="d-val">' + esc(teamNames || "—") + "</div></div>" +
      '<div><div class="d-label">Funções</div><div class="d-val">' + esc(funcs || "—") + "</div></div>" +
      '<div><div class="d-label">Condutor(a)</div><div class="d-val">' + esc(u.conductor || "—") + "</div></div>" +
      '<div><div class="d-label">Formulário de primeiro acesso</div><div class="d-val">' + (u.firstAccess && u.firstAccess.done ? "Enviado em " + esc(U.fmtDate(u.firstAccess.at.slice(0, 10))) + " · mês " + esc(firstAccessMonth(u)) : '<span class="badge amber">Pendente</span>') + "</div></div>" +
      '<div><div class="d-label">LGPD</div><div class="d-val">' + (u.lgpd && u.lgpd.status === "aceito" ? "Aceito em " + esc(U.fmtDate((u.lgpd.at || "").slice(0, 10))) + " · v" + esc(u.lgpd.version) : '<span class="badge red">' + esc(u.lgpd ? u.lgpd.status : "pendente") + "</span>") + "</div></div>" +
      (u.role === "dirigente" ? '<div><div class="d-label">Permissões administrativas</div><div class="d-val">' + esc((u.permissions || []).map(function (p) { var m = N.PERMISSIONS.find(function (x) { return x.id === p; }); return m ? m.label : p; }).join(", ") || "Nenhuma") + "</div></div>" : "") +
      (u.blockedReason ? '<div><div class="d-label">Motivo do bloqueio</div><div class="d-val">' + esc(u.blockedReason) + "</div></div>" : "") +
      '<div><div class="d-label">Cadastrado em</div><div class="d-val">' + esc(U.fmtDate((u.createdAt || "").slice(0, 10))) + "</div></div>" +
      "</div>" +
      '<div class="row" style="padding:0 18px 16px;gap:8px">' +
        '<button class="btn btn-ghost btn-sm" data-edit-user="' + esc(u.id) + '">Editar cadastro</button>' +
        (u.status === "bloqueado" ? '<button class="btn btn-primary btn-sm" data-release-user="' + esc(u.id) + '">Liberar acesso</button>' : "") +
        (u.status !== "bloqueado" && u.id !== N.currentUser().id ? '<button class="btn btn-danger btn-sm" data-block-user="' + esc(u.id) + '">Bloquear acesso</button>' : "") +
        (u.id !== N.currentUser().id ? '<button class="btn btn-danger btn-sm" data-delete-user="' + esc(u.id) + '">Excluir</button>' : "") +
      "</div>";
  }

  function renderUserTable(users, opts) {
    if (!users.length) return N.empty("Nenhum cadastro", "Nenhum usuário corresponde aos filtros selecionados.", "users");
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Nome</th><th></th></tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr class="expandable" data-user-row="' + esc(u.id) + '"><td><div class="cell-name">' + N.avatar(u.name) +
          '<div><div style="font-weight:600">' + esc(u.name) + '</div><div class="tiny" style="text-transform:none;letter-spacing:0;color:#6f757d">' + esc(opts && opts.sub ? opts.sub(u) : "") + "</div></div>" +
          "</div></td>" +
          '<td class="text-right tiny" style="white-space:nowrap;color:#6f757d">' + N.icon("chevronDown") + " ver dados</td></tr>" +
          '<tr class="detail-row hidden" data-user-detail="' + esc(u.id) + '"><td colspan="2">' + userDetail(u) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function userExpandedActions(container) {
    Array.prototype.forEach.call(container.querySelectorAll("[data-user-row]"), function (row) {
      row.addEventListener("click", function () {
        var detail = container.querySelector('[data-user-detail="' + row.getAttribute("data-user-row") + '"]');
        if (detail) detail.classList.toggle("hidden");
      });
    });
    Array.prototype.forEach.call(container.querySelectorAll("[data-edit-user]"), function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); openUserModal(b.getAttribute("data-edit-user")); });
    });
    Array.prototype.forEach.call(container.querySelectorAll("[data-release-user]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var u = N.userById(b.getAttribute("data-release-user"));
        N.confirm({
          title: "Liberar acesso",
          text: "Liberar o acesso de " + u.name + "? O usuário deverá entrar novamente e registrar uma nova decisão sobre a LGPD.",
          confirmLabel: "Liberar acesso",
          onConfirm: function () {
            N.releaseAccess(u.id);
            N.toast("Acesso liberado. O usuário foi notificado.", "ok");
            N.render();
          }
        });
      });
    });
    Array.prototype.forEach.call(container.querySelectorAll("[data-block-user]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var u = N.userById(b.getAttribute("data-block-user"));
        N.confirm({
          title: "Bloquear acesso",
          text: "Bloquear o acesso de " + u.name + "? O cadastro é mantido, mas o usuário não conseguirá entrar até a liberação.",
          confirmLabel: "Bloquear", danger: true,
          onConfirm: function () {
            u.status = "bloqueado";
            u.blockedReason = "Acesso bloqueado pelo administrador em " + U.fmtDate(U.todayISO()) + ".";
            N.audit("Acesso bloqueado", u.name, { status: "ativo" }, { status: "bloqueado" }, u.units[0]);
            N.notify({ title: "Acesso bloqueado", audience: "user", userId: u.id, unit: u.units[0], type: "acesso", text: "Seu acesso ao sistema foi bloqueado pelo administrador. Procure a liderança para mais informações." });
            N.persist();
            N.toast("Acesso bloqueado.", "warn");
            N.render();
          }
        });
      });
    });
    Array.prototype.forEach.call(container.querySelectorAll("[data-delete-user]"), function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var u = N.userById(b.getAttribute("data-delete-user"));
        N.confirm({
          title: "Excluir usuário",
          text: "Excluir definitivamente " + u.name + "? As escalas futuras em que a pessoa está alocada ficarão como vaga aberta. Esta ação é registrada no histórico.",
          confirmLabel: "Excluir usuário", danger: true,
          onConfirm: function () { deleteUser(u.id); }
        });
      });
    });
  }

  function deleteUser(id) {
    var u = N.userById(id);
    if (!u) return;
    N.state().schedules.forEach(function (sc) {
      sc.assignments.forEach(function (a) {
        if (a.userId === id) { a.userId = null; a.status = "vaga_aberta"; a.respondedAt = null; }
      });
    });
    N.state().users = N.state().users.filter(function (x) { return x.id !== id; });
    N.state().availability = N.state().availability.filter(function (a) { return a.userId !== id; });
    N.state().swaps = N.state().swaps.filter(function (s) { return s.requesterId !== id && s.suggestedUserId !== id; });
    N.state().notifications = N.state().notifications.filter(function (n) { return n.userId !== id; });
    N.audit("Usuário excluído", u.name, { email: u.email, perfil: u.role, unidades: u.units }, null, u.units[0]);
    N.persist();
    N.toast("Usuário excluído.", "warn");
    N.render();
  }

  function openUserModal(id) {
    var editing = id ? N.userById(id) : null;
    var user = editing || { name: "", email: "", phone: "", units: [N.scopeUnits()[0]], role: "voluntario", teamIds: [], functions: [], permissions: [], conductor: "" };
    var body =
      '<div class="form-grid">' +
        '<div class="field full"><label>Nome completo <span class="req">*</span></label><input class="input" id="u-name" value="' + esc(user.name) + '" /></div>' +
        '<div class="field"><label>E-mail de acesso <span class="req">*</span></label><input class="input" id="u-email" type="email" value="' + esc(user.email) + '" autocomplete="off" /></div>' +
        '<div class="field"><label>Telefone / WhatsApp <span class="req">*</span></label><input class="input" id="u-phone" value="' + esc(user.phone) + '" inputmode="tel" /></div>' +
        '<div class="field"><label>Tipo de usuário</label><select class="select" id="u-role">' +
          N.options([{ value: "voluntario", label: "Voluntário" }, { value: "dirigente", label: "Dirigente" }, { value: "admin", label: "Administrador" }], user.role) + "</select></div>" +
        '<div class="field"><label>Nome do condutor(a)</label><input class="input" id="u-conductor" value="' + esc(user.conductor || "") + '" /></div>' +
        '<div class="field full"><label>Unidade ou unidades <span class="req">*</span></label><div class="chip-set" id="u-units">' +
          editableUnits().map(function (un) {
            return '<label class="chip ' + (user.units.indexOf(un) >= 0 ? "on" : "") + '"><input type="checkbox" value="' + un + '"' + (user.units.indexOf(un) >= 0 ? " checked" : "") + " />" + esc(N.unitName(un)) + "</label>";
          }).join("") + "</div></div>" +
        '<div class="field full"><label>Equipes</label><div class="chip-set" id="u-teams">' +
          editableTeams().map(function (t) {
            return '<label class="chip ' + (user.teamIds.indexOf(t.id) >= 0 ? "on" : "") + '"><input type="checkbox" value="' + esc(t.id) + '"' + (user.teamIds.indexOf(t.id) >= 0 ? " checked" : "") + " />" + esc(t.name) + " · " + esc(N.unitName(t.unit, true)) + "</label>";
          }).join("") + "</div></div>" +
        '<div class="field full"><label>Funções que sabe desempenhar</label><div id="u-functions" class="stack-sm"></div></div>' +
        '<div class="field full hidden" id="u-perms-wrap"><label>Permissões específicas do dirigente</label><div class="chip-set" id="u-perms">' +
          N.PERMISSIONS.map(function (p) {
            var on = (user.permissions || []).indexOf(p.id) >= 0;
            return '<label class="chip ' + (on ? "on" : "") + '"><input type="checkbox" value="' + p.id + '"' + (on ? " checked" : "") + " />" + esc(p.label) + "</label>";
          }).join("") + "</div>" +
          '<span class="help">Dirigentes já possuem todas as funções de voluntário. As permissões acima liberam o acompanhamento das equipes e escalas.</span></div>' +
      "</div>" +
      (editing ? "" : '<div class="alert info" style="margin-top:14px">' + N.icon("info") + "<div>O acesso é liberado no ato do cadastro, sem convite. O usuário entrará com este e-mail e ficará como <b>Pendente de primeiro login</b> até o primeiro acesso.</div></div>") +
      '<div id="u-error" style="margin-top:12px"></div>';

    N.modal({
      title: editing ? "Editar cadastro" : "Novo usuário",
      subtitle: editing ? user.email : "Somente administradores podem cadastrar usuários",
      body: body, wide: true,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="u-save">' + (editing ? "Salvar alterações" : "Cadastrar e liberar acesso") + "</button>",
      onMount: function (wrap) {
        var teamsBox = wrap.querySelector("#u-teams");
        var fnBox = wrap.querySelector("#u-functions");
        var roleSel = wrap.querySelector("#u-role");
        var permsWrap = wrap.querySelector("#u-perms-wrap");

        function togglePerms() {
          permsWrap.classList.toggle("hidden", roleSel.value !== "dirigente");
        }
        function selectedTeams() {
          return Array.prototype.filter.call(teamsBox.querySelectorAll("input"), function (i) { return i.checked; }).map(function (i) { return i.value; });
        }
        function renderFunctions() {
          var teams = selectedTeams();
          if (!teams.length) { fnBox.innerHTML = '<span class="help">Selecione ao menos uma equipe para listar as funções.</span>'; return; }
          fnBox.innerHTML = teams.map(function (tid) {
            var t = N.teamById(tid);
            if (!t) return "";
            return '<div><div class="tiny" style="margin-bottom:6px">' + esc(t.name) + "</div><div class=\"chip-set\">" +
              t.roles.map(function (r) {
                var on = (user.functions || []).some(function (f) { return f.teamId === tid && f.roleId === r.id; });
                return '<label class="chip ' + (on ? "on" : "") + '"><input type="checkbox" data-fn data-team="' + esc(tid) + '" value="' + esc(r.id) + '"' + (on ? " checked" : "") + " />" + esc(r.name) + "</label>";
              }).join("") + "</div></div>";
          }).join("");
          Array.prototype.forEach.call(fnBox.querySelectorAll("label.chip"), function (chip) {
            var cb = chip.querySelector("input");
            cb.addEventListener("change", function () { chip.classList.toggle("on", cb.checked); });
          });
        }
        Array.prototype.forEach.call(teamsBox.querySelectorAll("label.chip"), function (chip) {
          var cb = chip.querySelector("input");
          cb.addEventListener("change", function () { chip.classList.toggle("on", cb.checked); renderFunctions(); });
        });
        Array.prototype.forEach.call(wrap.querySelectorAll("#u-units label.chip, #u-perms label.chip"), function (chip) {
          var cb = chip.querySelector("input");
          cb.addEventListener("change", function () { chip.classList.toggle("on", cb.checked); });
        });
        roleSel.addEventListener("change", togglePerms);
        togglePerms();
        renderFunctions();

        wrap.querySelector("#u-save").addEventListener("click", function () {
          var name = wrap.querySelector("#u-name").value.trim();
          var email = wrap.querySelector("#u-email").value.trim();
          var phone = wrap.querySelector("#u-phone").value.trim();
          var role = roleSel.value;
          var conductor = wrap.querySelector("#u-conductor").value.trim();
          var units = Array.prototype.filter.call(wrap.querySelectorAll("#u-units input"), function (i) { return i.checked; }).map(function (i) { return i.value; });
          var teamIds = selectedTeams();
          var functions = Array.prototype.filter.call(wrap.querySelectorAll("[data-fn]"), function (i) { return i.checked; }).map(function (i) {
            return { teamId: i.getAttribute("data-team"), roleId: i.value };
          });
          var permissions = Array.prototype.filter.call(wrap.querySelectorAll("#u-perms input"), function (i) { return i.checked; }).map(function (i) { return i.value; });
          var err = [];
          if (!name) err.push("Informe o nome completo.");
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.push("Informe um e-mail válido.");
          if (U.digits(phone).length < 10) err.push("Informe um telefone válido com DDD.");
          if (!units.length) err.push("Selecione ao menos uma unidade.");
          var dupe = N.state().users.find(function (x) { return x.email.toLowerCase() === email.toLowerCase() && x.id !== (editing ? editing.id : ""); });
          if (dupe) err.push("Já existe um usuário com este e-mail.");
          if (err.length) {
            wrap.querySelector("#u-error").innerHTML = '<div class="alert danger">' + N.icon("alert") + "<div>" + err.map(esc).join("<br/>") + "</div></div>";
            return;
          }
          if (editing) {
            var outsideUnits = editing.units.filter(function (x) { return editableUnits().indexOf(x) < 0; });
            units = outsideUnits.concat(units);
            var shownTeams = editableTeams().map(function (t) { return t.id; });
            teamIds = editing.teamIds.filter(function (x) { return shownTeams.indexOf(x) < 0; }).concat(teamIds);
            functions = editing.functions.filter(function (f) { return shownTeams.indexOf(f.teamId) < 0; }).concat(functions);
            var before = { nome: editing.name, email: editing.email, perfil: editing.role, unidades: editing.units.slice(), equipes: editing.teamIds.slice() };
            editing.name = name; editing.email = email; editing.phone = phone; editing.role = role;
            editing.conductor = conductor; editing.units = units; editing.teamIds = teamIds;
            editing.functions = functions; editing.permissions = role === "dirigente" ? permissions : [];
            N.audit("Usuário alterado", name, before, { nome: name, email: email, perfil: role, unidades: units, equipes: teamIds });
          } else {
            var nu = {
              id: U.uid("u"), name: name, email: email, phone: phone, units: units, role: role,
              teamIds: teamIds, functions: functions, permissions: role === "dirigente" ? permissions : [],
              conductor: conductor, status: "pendente", blockedReason: "",
              lgpd: { status: "pendente", at: null, version: N.termVersion() },
              firstAccess: { done: false }, createdAt: new Date().toISOString()
            };
            N.state().users.push(nu);
            N.audit("Usuário cadastrado", name, null, { email: email, perfil: role, unidades: units, status: "pendente de primeiro login" });
            N.notify({ title: "Novo usuário cadastrado", audience: "admin", unit: units[0], type: "cadastro", text: name + " foi cadastrado e aguarda o primeiro login." });
          }
          N.persist();
          N.closeModal();
          N.toast(editing ? "Cadastro atualizado." : "Usuário cadastrado com acesso liberado.", "ok");
          N.render();
        });
      }
    });
  }

  var users = {
    render: function () {
      var list = scopedUsers();
      var tabs = [
        { id: "todos", label: "Todos os usuários", filter: function () { return true; } },
        { id: "admins", label: "Administradores", filter: function (u) { return u.role === "admin"; } },
        { id: "dirigentes", label: "Dirigentes", filter: function (u) { return u.role === "dirigente"; } },
        { id: "voluntarios", label: "Voluntários", filter: function (u) { return u.role === "voluntario"; } },
        { id: "pendentes", label: "Aguardando primeiro login", filter: function (u) { return u.status === "pendente"; } },
        { id: "bloqueados", label: "Acessos bloqueados", filter: function (u) { return u.status === "bloqueado"; } }
      ];
      var active = tabs.find(function (t) { return t.id === uiState.usersTab; }) || tabs[0];
      var filtered = list.filter(active.filter);
      if (uiState.usersQuery) {
        var q = uiState.usersQuery.toLowerCase();
        filtered = filtered.filter(function (u) {
          return u.name.toLowerCase().indexOf(q) >= 0 || u.email.toLowerCase().indexOf(q) >= 0;
        });
      }
      filtered.sort(function (a, b) { return a.name.localeCompare(b.name, "pt-BR"); });

      var body =
        '<div class="card" style="padding:14px">' +
          '<div class="tabs">' + tabs.map(function (t) {
            var count = t.id === "todos" ? list.length : list.filter(t.filter).length;
            return '<button class="tab ' + (t.id === active.id ? "active" : "") + '" data-utab="' + t.id + '">' + esc(t.label) + '<span class="count">' + count + "</span></button>";
          }).join("") + "</div>" +
          '<div class="row" style="justify-content:space-between;margin-bottom:12px">' +
            '<div class="row" style="gap:8px;flex:1"><input class="input" id="u-search" placeholder="Buscar por nome ou e-mail" value="' + esc(uiState.usersQuery) + '" style="max-width:340px" />' +
            '<span class="small muted">' + filtered.length + " cadastro(s)</span></div>" +
            (N.canManageUsers() ? '<button class="btn btn-primary btn-sm" id="new-user">' + N.icon("plus") + " Novo usuário</button>" : "") +
          "</div>" +
          '<div id="users-table">' + renderUserTable(filtered) + "</div>" +
        "</div>" +
        '<div class="alert info" style="margin-top:14px">' + N.icon("shield") + "<div>A listagem mostra apenas o nome. Clique no nome para visualizar todos os dados do cadastro. Não existe criação pública de contas: apenas administradores cadastram, editam e excluem usuários.</div></div>";

      return N.pageHead("Usuários", "Cadastros, perfis, permissões e controle de acesso.", "") + body;
    },
    mount: function () {
      var table = document.getElementById("users-table");
      userExpandedActions(document);
      Array.prototype.forEach.call(document.querySelectorAll("[data-utab]"), function (b) {
        b.addEventListener("click", function () { uiState.usersTab = b.getAttribute("data-utab"); N.render(); });
      });
      var search = document.getElementById("u-search");
      search.addEventListener("input", function () {
        uiState.usersQuery = search.value;
        var filtered = (function () {
          var list = scopedUsers();
          var map = { todos: function () { return true; }, admins: function (u) { return u.role === "admin"; }, dirigentes: function (u) { return u.role === "dirigente"; }, voluntarios: function (u) { return u.role === "voluntario"; }, pendentes: function (u) { return u.status === "pendente"; }, bloqueados: function (u) { return u.status === "bloqueado"; } };
          var f = map[uiState.usersTab] || map.todos;
          var q = search.value.toLowerCase();
          return list.filter(f).filter(function (u) { return !q || u.name.toLowerCase().indexOf(q) >= 0 || u.email.toLowerCase().indexOf(q) >= 0; })
            .sort(function (a, b) { return a.name.localeCompare(b.name, "pt-BR"); });
        })();
        table.innerHTML = renderUserTable(filtered);
        userExpandedActions(table);
      });
      var btn = document.getElementById("new-user");
      if (btn) btn.addEventListener("click", function () { openUserModal(null); });
    }
  };

  /* ================================ VOLUNTÁRIOS ================================ */
  var volunteers = {
    render: function () {
      var list = scopedUsers().filter(function (u) { return u.role !== "admin"; });
      if (uiState.volunteerQuery) {
        var q = uiState.volunteerQuery.toLowerCase();
        list = list.filter(function (u) {
          return u.name.toLowerCase().indexOf(q) >= 0 || u.phone.toLowerCase().indexOf(q) >= 0 ||
            u.teamIds.some(function (t) { return ((N.teamById(t) || {}).name || "").toLowerCase().indexOf(q) >= 0; });
        });
      }
      list.sort(function (a, b) { return a.name.localeCompare(b.name, "pt-BR"); });
      var body =
        '<div class="card" style="padding:14px">' +
          '<div class="row" style="justify-content:space-between;margin-bottom:12px">' +
            '<div class="row" style="gap:8px;flex:1"><input class="input" id="v-search" placeholder="Buscar voluntário, telefone ou equipe" value="' + esc(uiState.volunteerQuery) + '" style="max-width:340px" />' +
            '<span class="small muted">' + list.length + " voluntário(s) e dirigente(s)</span></div>" +
            (N.isAdmin() ? '<button class="btn btn-primary btn-sm" id="new-vol">' + N.icon("plus") + " Novo voluntário</button>" : "") +
          "</div>" +
          renderUserTable(list, { sub: function (u) { return u.phone + " · " + u.teamIds.map(function (t) { return (N.teamById(t) || {}).name; }).join(", "); } }) +
        "</div>" +
        '<div class="alert info" style="margin-top:14px">' + N.icon("info") + "<div>O cadastro do voluntário é integrado automaticamente ao módulo de usuários, evitando duplicidade. Um voluntário pode participar de várias equipes e funções, e cada pessoa pode pertencer às duas unidades.</div></div>";
      return N.pageHead("Voluntários", "Dados, equipes, funções, condutor(a) e formulário de primeiro acesso.", "") + body;
    },
    mount: function () {
      userExpandedActions(document);
      var search = document.getElementById("v-search");
      if (search) search.addEventListener("input", function () {
        uiState.volunteerQuery = search.value;
        N.render();
        var el = document.getElementById("v-search");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
      var b = document.getElementById("new-vol");
      if (b) b.addEventListener("click", function () { openUserModal(null); });
    }
  };

  /* ================================ EQUIPES ================================ */
  var teams = {
    render: function () {
      var list = scopedTeams();
      var units = N.scopeUnits();
      var body = units.map(function (unit) {
        var unitTeams = list.filter(function (t) { return t.unit === unit; });
        return '<div style="margin-bottom:22px"><div class="row-between" style="margin-bottom:10px"><div class="row"><h2 style="font-size:16px">' + esc(N.unitName(unit)) + '</h2><span class="badge gray plain">' + unitTeams.length + " equipe(s)</span></div>" +
          (N.isAdmin() ? '<button class="btn btn-primary btn-sm" data-new-team="' + unit + '">' + N.icon("plus") + " Nova equipe</button>" : "") + "</div>" +
          (unitTeams.length ? '<div class="grid-3">' + unitTeams.map(function (t) {
            var members = N.state().users.filter(function (u) { return u.teamIds.indexOf(t.id) >= 0; });
            var totalVagas = t.roles.reduce(function (s, r) { return s + Number(r.vagas || 0); }, 0);
            return '<div class="card"><div class="card-title"><div><h3>' + esc(t.name) + '</h3><div class="tiny" style="text-transform:none;letter-spacing:0;margin-top:3px">' + members.length + " voluntário(s) · " + totalVagas + " vaga(s)</div></div>" +
              (N.isAdmin() ? '<div class="row" style="gap:4px"><button class="btn btn-icon btn-ghost" data-edit-team="' + esc(t.id) + '" title="Editar">' + N.icon("settings") + '</button><button class="btn btn-icon btn-ghost" data-del-team="' + esc(t.id) + '" title="Excluir">' + N.icon("close") + "</button></div>" : "") +
              "</div>" +
              '<div class="stack-sm">' + t.roles.map(function (r) {
                return '<div class="row-between" style="gap:8px;font-size:12.5px"><span>' + esc(r.name) + '</span><span class="badge blue plain">' + r.vagas + " vaga(s)</span></div>";
              }).join("") + "</div>" +
              '<div class="divider" style="margin:12px 0"></div>' +
              '<div class="tiny">Equipe</div><div class="small muted" style="margin-top:3px">' + esc(members.slice(0, 4).map(function (m) { return m.name.split(" ")[0]; }).join(", ") || "Sem voluntários vinculados") + (members.length > 4 ? " +" + (members.length - 4) : "") + "</div>" +
              "</div>";
          }).join("") + "</div>" : N.empty("Nenhuma equipe", "Crie a primeira equipe desta unidade e configure funções e vagas.", "teams")) +
          "</div>";
      }).join("");
      return N.pageHead("Equipes e funções", "Cada equipe permite cadastrar funções e quantidade de vagas por função.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-new-team]"), function (b) {
        b.addEventListener("click", function () { openTeamModal(null, b.getAttribute("data-new-team")); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-edit-team]"), function (b) {
        b.addEventListener("click", function () { openTeamModal(b.getAttribute("data-edit-team")); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-del-team]"), function (b) {
        b.addEventListener("click", function () {
          var t = N.teamById(b.getAttribute("data-del-team"));
          N.confirm({
            title: "Excluir equipe",
            text: "Excluir a equipe " + t.name + "? As escalas e vínculos que usam esta equipe serão ajustados.",
            confirmLabel: "Excluir equipe", danger: true,
            onConfirm: function () {
              N.state().users.forEach(function (u) {
                if (u.teamIds.indexOf(t.id) >= 0) u.teamIds = u.teamIds.filter(function (x) { return x !== t.id; });
                u.functions = u.functions.filter(function (f) { return f.teamId !== t.id; });
              });
              N.state().events.forEach(function (e) {
                e.needs = e.needs.filter(function (n) { return n.teamId !== t.id; });
              });
              N.state().schedules.forEach(function (sc) {
                sc.assignments.forEach(function (a) {
                  if (a.teamId === t.id) { a.userId = null; a.status = "vaga_aberta"; }
                });
              });
              N.state().teams = N.state().teams.filter(function (x) { return x.id !== t.id; });
              N.audit("Equipe excluída", t.name, { funções: t.roles.length }, null, t.unit);
              N.persist();
              N.toast("Equipe excluída.", "warn");
              N.render();
            }
          });
        });
      });
    }
  };

  function openTeamModal(id, unitId) {
    var editing = id ? N.teamById(id) : null;
    var unit = editing ? editing.unit : (unitId || N.scopeUnits()[0]);
    var roles = editing ? editing.roles.map(function (r) { return { id: r.id, name: r.name, vagas: r.vagas }; }) : [{ id: U.uid("r"), name: "", vagas: 1 }];
    var body =
      '<div class="form-grid">' +
        '<div class="field"><label>Nome da equipe <span class="req">*</span></label><input class="input" id="t-name" value="' + esc(editing ? editing.name : "") + '" placeholder="Ex.: Som, Projeção, Recepção, Louvor" /></div>' +
        '<div class="field"><label>Unidade <span class="req">*</span></label><select class="select" id="t-unit">' + unitOptions(unit) + "</select></div>" +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="row-between" style="margin-bottom:10px"><h3 style="font-size:13px">Funções e vagas</h3><button class="btn btn-ghost btn-sm" id="t-add-role">' + N.icon("plus") + " Adicionar função</button></div>" +
      '<div class="stack-sm" id="t-roles"></div>' +
      '<div id="t-error" style="margin-top:12px"></div>';
    N.modal({
      title: editing ? "Editar equipe" : "Nova equipe",
      subtitle: editing ? N.unitName(editing.unit) : "Defina as funções e a quantidade de vagas",
      body: body, wide: true,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="t-save">Salvar equipe</button>',
      onMount: function (wrap) {
        function renderRoles() {
          wrap.querySelector("#t-roles").innerHTML = roles.map(function (r, idx) {
            return '<div class="row" data-role-row="' + idx + '" style="gap:8px"><input class="input" data-role-name value="' + esc(r.name) + '" placeholder="Nome da função" style="flex:2" />' +
              '<input class="input" data-role-vagas type="number" min="1" value="' + esc(r.vagas) + '" style="max-width:110px" title="Vagas" />' +
              '<button class="btn btn-icon btn-ghost" data-remove-role="' + idx + '" title="Remover">' + N.icon("close") + "</button></div>";
          }).join("");
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-role-name]"), function (inp, i) {
            inp.addEventListener("input", function () { roles[i].name = inp.value; });
          });
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-role-vagas]"), function (inp, i) {
            inp.addEventListener("input", function () { roles[i].vagas = Math.max(1, Number(inp.value) || 1); });
          });
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-remove-role]"), function (b) {
            b.addEventListener("click", function () {
              if (roles.length <= 1) { N.toast("A equipe precisa de ao menos uma função.", "warn"); return; }
              roles.splice(Number(b.getAttribute("data-remove-role")), 1);
              renderRoles();
            });
          });
        }
        renderRoles();
        wrap.querySelector("#t-add-role").addEventListener("click", function () {
          roles.push({ id: U.uid("r"), name: "", vagas: 1 });
          renderRoles();
        });
        wrap.querySelector("#t-save").addEventListener("click", function () {
          var name = wrap.querySelector("#t-name").value.trim();
          var unitSel = wrap.querySelector("#t-unit").value;
          if (!name) { wrap.querySelector("#t-error").innerHTML = '<div class="alert danger">Informe o nome da equipe.</div>'; return; }
          if (roles.some(function (r) { return !r.name.trim(); })) { wrap.querySelector("#t-error").innerHTML = '<div class="alert danger">Informe o nome de todas as funções.</div>'; return; }
          var payload = roles.map(function (r) { return { id: r.id, name: r.name.trim(), vagas: Math.max(1, Number(r.vagas) || 1) }; });
          if (editing) {
            var before = { nome: editing.name, unidade: editing.unit, funções: editing.roles.map(function (r) { return r.name + " (" + r.vagas + ")"; }) };
            var removed = editing.roles.filter(function (r) { return !payload.some(function (p) { return p.id === r.id; }); });
            editing.name = name; editing.unit = unitSel; editing.roles = payload;
            N.state().users.forEach(function (u) {
              removed.forEach(function (r) {
                u.functions = u.functions.filter(function (f) { return f.roleId !== r.id; });
              });
            });
            N.state().schedules.forEach(function (sc) {
              sc.assignments.forEach(function (a) {
                removed.forEach(function (r) { if (a.roleId === r.id) { a.userId = null; a.status = "vaga_aberta"; } });
              });
            });
            N.audit("Equipe alterada", name, before, { nome: name, funções: payload.map(function (r) { return r.name + " (" + r.vagas + ")"; }) }, unitSel);
          } else {
            N.state().teams.push({ id: U.uid("t"), unit: unitSel, name: name, roles: payload });
            N.audit("Equipe criada", name, null, { unidade: unitSel, funções: payload.map(function (r) { return r.name + " (" + r.vagas + ")"; }) }, unitSel);
          }
          N.persist();
          N.closeModal();
          N.toast("Equipe salva.", "ok");
          N.render();
        });
      }
    });
  }

  /* ================================ EVENTOS ================================ */
  var events = {
    render: function () {
      var list = scopedEvents().slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
      var future = list.filter(function (e) { return U.daysUntil(e.date) >= 0; });
      var past = list.filter(function (e) { return U.daysUntil(e.date) < 0; }).reverse().slice(0, 6);

      function card(e) {
        var sc = N.scheduleByEvent(e.id);
        var total = e.needs.reduce(function (s, n) { return s + Number(n.vagas || 0); }, 0);
        var filled = sc ? sc.assignments.filter(function (a) { return !!a.userId; }).length : 0;
        return '<div class="card" style="margin-bottom:10px"><div class="row-between" style="align-items:flex-start">' +
          '<div class="row" style="align-items:flex-start;gap:12px"><div class="event-date"><b>' + esc(e.date.slice(8, 10)) + "</b><span>" + esc(N.MONTHS_SHORT[Number(e.date.slice(5, 7)) - 1]) + "</span></div>" +
            "<div><h3 style=\"font-size:14.5px\">" + esc(e.name) + " " + (sc ? N.statusBadge("montada") : "") + "</h3>" +
            '<div class="small muted" style="margin-top:4px">' + esc(U.fmtDateShort(e.date)) + " às " + esc(e.time) + " · " + esc(N.unitName(e.unit)) + " · " + filled + "/" + total + " vagas</div>" +
            '<div class="small muted" style="margin-top:3px">' + e.needs.map(function (n) { return esc((N.teamById(n.teamId) || {}).name + ": " + (N.roleOf(n.teamId, n.roleId) || {}).name + " (" + n.vagas + ")"); }).join(" · ") + "</div>" +
            (sc ? '<div class="tiny" style="margin-top:6px;letter-spacing:0;text-transform:none">' + sc.assignments.filter(function (a) { return a.status === "confirmado"; }).length + " confirmado(s) · " + sc.assignments.filter(function (a) { return a.status === "pendente"; }).length + " pendente(s) · " + sc.assignments.filter(function (a) { return a.status === "recusado"; }).length + " recusa(s)</div>" : "") +
            "</div></div>" +
          '<div class="btn-group">' +
            '<button class="btn btn-ghost btn-sm" data-schedule="' + esc(e.id) + '">' + (sc ? "Editar escala" : "Montar escala") + "</button>" +
            (N.isAdmin() ? '<button class="btn btn-icon btn-ghost" data-edit-event="' + esc(e.id) + '" title="Editar evento">' + N.icon("settings") + "</button>" +
              '<button class="btn btn-icon btn-ghost" data-del-event="' + esc(e.id) + '" title="Excluir evento">' + N.icon("close") + "</button>" : "") +
          "</div></div></div>";
      }

      var body = '<div class="row-between" style="margin-bottom:12px"><div class="row"><h2 style="font-size:16px">Próximos eventos</h2><span class="badge gray plain">' + future.length + '</span></div>' +
        (N.isAdmin() ? '<button class="btn btn-primary btn-sm" id="new-event">' + N.icon("plus") + " Novo evento</button>" : "") + "</div>" +
        (future.length ? future.map(card).join("") : N.empty("Nenhum evento futuro", "Cadastre os cultos e eventos para montar as escalas.", "calendar")) +
        (past.length ? '<h2 style="font-size:15px;margin:24px 0 10px">Eventos anteriores</h2>' + past.map(card).join("") : "");
      return N.pageHead("Eventos", "Cadastro de eventos com data, horário, unidade, equipes, funções e vagas.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-schedule]"), function (b) {
        b.addEventListener("click", function () { N.navigate("escala-editor", { eventId: b.getAttribute("data-schedule") }); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-edit-event]"), function (b) {
        b.addEventListener("click", function () { openEventModal(b.getAttribute("data-edit-event")); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-del-event]"), function (b) {
        b.addEventListener("click", function () {
          var ev = N.eventById(b.getAttribute("data-del-event"));
          N.confirm({
            title: "Excluir evento",
            text: "Excluir o evento " + ev.name + " de " + U.fmtDate(ev.date) + "? A escala vinculada e as solicitações de troca serão removidas.",
            confirmLabel: "Excluir evento", danger: true,
            onConfirm: function () {
              N.state().events = N.state().events.filter(function (e) { return e.id !== ev.id; });
              N.state().schedules = N.state().schedules.filter(function (s) { return s.eventId !== ev.id; });
              N.state().swaps = N.state().swaps.filter(function (s) { return s.eventId !== ev.id; });
              N.audit("Evento excluído", ev.name + " · " + U.fmtDate(ev.date), { evento: ev.name }, null, ev.unit);
              N.persist();
              N.toast("Evento excluído.", "warn");
              N.render();
            }
          });
        });
      });
      var nb = document.getElementById("new-event");
      if (nb) nb.addEventListener("click", function () { openEventModal(null); });
    }
  };

  function openEventModal(id) {
    var editing = id ? N.eventById(id) : null;
    var ev = editing || { name: "", date: U.todayISO(), time: "19:30", unit: N.scopeUnits()[0], needs: [] };
    var needs = ev.needs.map(function (n) { return { teamId: n.teamId, roleId: n.roleId, vagas: n.vagas }; });
    if (!needs.length) needs.push({ teamId: "", roleId: "", vagas: 1 });

    var body =
      '<div class="form-grid">' +
        '<div class="field full"><label>Nome do evento <span class="req">*</span></label><input class="input" id="e-name" value="' + esc(ev.name) + '" placeholder="Ex.: Culto da Manhã" /></div>' +
        '<div class="field"><label>Data <span class="req">*</span></label><input class="input" id="e-date" type="date" value="' + esc(ev.date) + '" /></div>' +
        '<div class="field"><label>Horário <span class="req">*</span></label><input class="input" id="e-time" type="time" value="' + esc(ev.time) + '" /></div>' +
        '<div class="field full"><label>Unidade <span class="req">*</span></label><select class="select" id="e-unit">' + unitOptions(ev.unit) + "</select></div>" +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="row-between" style="margin-bottom:10px"><h3 style="font-size:13px">Equipes, funções e vagas necessárias</h3><button class="btn btn-ghost btn-sm" id="e-add">' + N.icon("plus") + " Adicionar função</button></div>" +
      '<div class="stack-sm" id="e-needs"></div>' +
      '<div id="e-error" style="margin-top:12px"></div>';

    N.modal({
      title: editing ? "Editar evento" : "Novo evento",
      subtitle: "Defina as equipes necessárias e a quantidade de vagas por função",
      body: body, wide: true,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="e-save">Salvar evento</button>',
      onMount: function (wrap) {
        function teamOptions(unit, sel) {
          return '<option value="">Equipe</option>' + scopedTeams().filter(function (t) { return t.unit === unit; }).map(function (t) {
            return '<option value="' + esc(t.id) + '"' + (t.id === sel ? " selected" : "") + ">" + esc(t.name) + "</option>";
          }).join("");
        }
        function roleOptions(teamId, sel) {
          var t = N.teamById(teamId);
          if (!t) return '<option value="">Função</option>';
          return '<option value="">Função</option>' + t.roles.map(function (r) {
            return '<option value="' + esc(r.id) + '"' + (r.id === sel ? " selected" : "") + ">" + esc(r.name) + "</option>";
          }).join("");
        }
        function renderNeeds() {
          var unit = wrap.querySelector("#e-unit").value;
          wrap.querySelector("#e-needs").innerHTML = needs.map(function (n, idx) {
            return '<div class="row" data-need="' + idx + '" style="gap:8px">' +
              '<select class="select" data-need-team style="flex:1.2">' + teamOptions(unit, n.teamId) + "</select>" +
              '<select class="select" data-need-role style="flex:1">' + roleOptions(n.teamId, n.roleId) + "</select>" +
              '<input class="input" data-need-vagas type="number" min="1" value="' + esc(n.vagas) + '" style="max-width:96px" title="Vagas" />' +
              '<button class="btn btn-icon btn-ghost" data-need-del="' + idx + '">' + N.icon("close") + "</button></div>";
          }).join("");
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-need-team]"), function (sel, i) {
            sel.addEventListener("change", function () { needs[i].teamId = sel.value; needs[i].roleId = ""; renderNeeds(); });
          });
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-need-role]"), function (sel, i) {
            sel.addEventListener("change", function () { needs[i].roleId = sel.value; });
          });
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-need-vagas]"), function (inp, i) {
            inp.addEventListener("input", function () { needs[i].vagas = Math.max(1, Number(inp.value) || 1); });
          });
          Array.prototype.forEach.call(wrap.querySelectorAll("[data-need-del]"), function (b) {
            b.addEventListener("click", function () {
              if (needs.length <= 1) { N.toast("O evento precisa de ao menos uma função.", "warn"); return; }
              needs.splice(Number(b.getAttribute("data-need-del")), 1); renderNeeds();
            });
          });
        }
        renderNeeds();
        wrap.querySelector("#e-unit").addEventListener("change", function () {
          needs.forEach(function (n) { n.teamId = ""; n.roleId = ""; });
          renderNeeds();
        });
        wrap.querySelector("#e-add").addEventListener("click", function () {
          needs.push({ teamId: "", roleId: "", vagas: 1 }); renderNeeds();
        });
        wrap.querySelector("#e-save").addEventListener("click", function () {
          var name = wrap.querySelector("#e-name").value.trim();
          var date = wrap.querySelector("#e-date").value;
          var time = wrap.querySelector("#e-time").value;
          var unit = wrap.querySelector("#e-unit").value;
          var err = [];
          if (!name) err.push("Informe o nome do evento.");
          if (!date) err.push("Informe a data.");
          if (!time) err.push("Informe o horário.");
          if (needs.some(function (n) { return !n.teamId || !n.roleId; })) err.push("Selecione equipe e função em todas as linhas.");
          if (err.length) { wrap.querySelector("#e-error").innerHTML = '<div class="alert danger">' + err.map(esc).join("<br/>") + "</div>"; return; }
          var payload = needs.map(function (n) { return { teamId: n.teamId, roleId: n.roleId, vagas: Math.max(1, Number(n.vagas) || 1) }; });
          if (editing) {
            var before = { nome: editing.name, data: editing.date, horario: editing.time, unidade: editing.unit, funções: editing.needs.length };
            editing.name = name; editing.date = date; editing.time = time; editing.unit = unit; editing.needs = payload;
            N.audit("Evento alterado", name + " · " + U.fmtDate(date), before, { nome: name, data: date, horario: time, unidade: unit }, unit);
          } else {
            var idNew = U.uid("ev");
            N.state().events.push({ id: idNew, name: name, date: date, time: time, unit: unit, needs: payload, createdAt: new Date().toISOString() });
            N.audit("Evento criado", name + " · " + U.fmtDate(date), null, { nome: name, data: date, horario: time, unidade: unit, funções: payload.length }, unit);
            N.notify({ title: "Novo evento cadastrado", audience: "admin", unit: unit, type: "evento", text: name + " em " + U.fmtDate(date) + " às " + time + "." });
          }
          N.persist();
          N.closeModal();
          N.toast("Evento salvo.", "ok");
          N.render();
        });
      }
    });
  }

  /* ================================ DISPONIBILIDADES ================================ */
  var availabilityAdmin = {
    render: function () {
      var month = uiState.availMonth || N.state().settings.availabilityMonth || U.monthOf(U.todayISO());
      uiState.availMonth = month;
      var users = scopedUsers().filter(function (u) { return u.role !== "admin"; });
      var rows = users.map(function (u) {
        return { user: u, av: N.availabilityFor(u.id, month) };
      });
      var received = rows.filter(function (r) { return r.av; });
      var pending = rows.filter(function (r) { return !r.av; });

      var body =
        '<div class="row-between" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">' +
          '<div class="row" style="gap:8px"><span class="small muted">Mês de referência</span>' + monthSelect("avail-month", month) + "</div>" +
          '<div class="row"><span class="badge green">' + received.length + " recebida(s)</span><span class=\"badge amber\">" + pending.length + " pendente(s)</span></div>" +
        "</div>" +
        '<div class="grid-2" style="align-items:start">' +
          '<div class="card"><div class="card-title"><h3>Respostas recebidas</h3><span class="hint">' + esc(U.monthLabel(month)) + "</span></div>" +
            (received.length ? received.map(function (r) {
              return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(r.user.name) + " " + N.unitBadges(r.user.units, true) + "</div>" +
                '<div class="li-sub">' + r.av.days.length + " dias · enviado em " + esc(U.fmtDateTime(r.av.submittedAt)) + "</div></div>" +
                '<button class="btn btn-ghost btn-sm" data-view-av="' + esc(r.user.id) + '">Ver</button></div>';
            }).join("") : N.empty("Nenhuma resposta", "Ainda não há disponibilidades enviadas neste mês.", "calendar")) +
          "</div>" +
          '<div class="card"><div class="card-title"><h3>Ainda não enviaram</h3><span class="hint">' + pending.length + "</span></div>" +
            (pending.length ? pending.map(function (r) {
              return '<div class="list-item"><div class="li-body"><div class="li-title">' + esc(r.user.name) + '</div><div class="li-sub">' + esc(r.user.phone) + " · " + esc(r.user.units.map(function (x) { return N.unitName(x, true); }).join(" / ")) + '</div></div><span class="badge amber">Pendente</span></div>';
            }).join("") : '<div class="alert ok">' + N.icon("check") + "<div>Todos os voluntários enviaram a disponibilidade deste mês.</div></div>") +
          "</div>" +
        "</div>" +
        '<div class="alert info" style="margin-top:14px">' + N.icon("info") + "<div>O calendário fica no perfil do voluntário, sem link externo. As datas enviadas não podem ser alteradas por ele. Dias com eventos não podem ser marcados como disponibilidade comum.</div></div>";

      return N.pageHead("Disponibilidades", "Consulta administrativa das respostas de disponibilidade.", "") + body;
    },
    mount: function () {
      var sel = document.getElementById("avail-month");
      sel.addEventListener("change", function () { uiState.availMonth = sel.value; N.render(); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-view-av]"), function (b) {
        b.addEventListener("click", function () { openAvailabilityDetail(b.getAttribute("data-view-av"), uiState.availMonth); });
      });
    }
  };

  function openAvailabilityDetail(userId, month) {
    var u = N.userById(userId);
    var av = N.availabilityFor(userId, month);
    if (!av) return;
    var evs = N.state().events.filter(function (e) { return u.units.indexOf(e.unit) >= 0 && U.monthOf(e.date) === month; });
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
      var marked = av.days.indexOf(day) >= 0;
      grid.push('<div class="cal-day ' + (hasEvent ? "event" : "") + " " + (marked ? "on" : "") + '"><span class="dnum">' + day + "</span>" +
        (hasEvent ? '<span class="obs">' + esc(evByDay[day].map(function (e) { return e.time; }).filter(function (t, i, arr) { return arr.indexOf(t) === i; }).join(" · ") + " culto") + "</span>" : marked ? '<span class="obs">Disponível</span>' : "") + "</div>");
    });
    grid.push("</div>");
    N.modal({
      title: u.name,
      subtitle: "Disponibilidade de " + U.monthLabel(month) + " · enviada em " + U.fmtDateTime(av.submittedAt),
      wide: true,
      body: grid.join("") + '<div class="alert info" style="margin-top:14px">' + N.icon("check") + "<div><b>" + av.days.length + " dias marcados.</b> O envio está bloqueado para o voluntário. Dias com evento entram automaticamente na disponibilidade.</div></div>",
      footer: '<button class="btn btn-ghost" data-close>Fechar</button>'
    });
  }

  /* ================================ TROCAS ================================ */
  var swaps = {
    render: function () {
      var list = scopedSwaps();
      var pending = list.filter(function (s) { return s.status === "pendente"; });
      var history = list.filter(function (s) { return s.status !== "pendente"; });

      function card(s) {
        var ev = N.eventById(s.eventId);
        var req = N.userById(s.requesterId);
        return '<div class="card" style="margin-bottom:10px">' +
          '<div class="row-between" style="align-items:flex-start">' +
            '<div><div class="row" style="gap:8px"><h3 style="font-size:14px">' + esc(ev ? ev.name : "Evento") + "</h3>" + N.statusBadge(s.status, "swap") + "</div>" +
            '<div class="small muted" style="margin-top:4px">' + esc(ev ? U.fmtDateLong(ev.date) + " às " + ev.time : "") + " · " + esc(N.unitName(s.unit)) + "</div>" +
            '<div class="small" style="margin-top:6px;color:#d4d6da">Solicitante: <b>' + esc(req ? req.name : "—") + "</b> · Função: " + esc(N.roleName(s.teamId, s.roleId)) + "</div>" +
            '<div class="small muted" style="margin-top:4px">Motivo: ' + esc(s.reason) + "</div>" +
            '<div class="small muted" style="margin-top:2px">Pessoa sugerida: ' + esc(s.suggestedUserId ? N.userName(s.suggestedUserId) : "não informada") + " · Solicitado em " + esc(U.fmtDateTime(s.createdAt)) + "</div>" +
            (s.adminNote ? '<div class="small" style="margin-top:4px;color:#f3c078">Observação: ' + esc(s.adminNote) + "</div>" : "") +
            (s.decidedAt ? '<div class="tiny" style="margin-top:6px;letter-spacing:0;text-transform:none">Decidido em ' + esc(U.fmtDateTime(s.decidedAt)) + " por " + esc(s.decidedBy ? N.userName(s.decidedBy) : "administrador") + "</div>" : "") +
            "</div>" +
            (s.status === "pendente" && N.isAdmin()
              ? '<div class="btn-group"><button class="btn btn-primary btn-sm" data-approve="' + esc(s.id) + '">Aprovar</button><button class="btn btn-danger btn-sm" data-reject="' + esc(s.id) + '">Rejeitar</button></div>'
              : "") +
          "</div></div>";
      }

      var body =
        '<div class="alert warn" style="margin-bottom:14px">' + N.icon("alert") + "<div>Toda troca depende de aprovação exclusiva do administrador. O limite é de duas solicitações por mês e não é permitido pedir troca faltando um dia para o evento. Pessoas já escaladas no mesmo evento não podem ser sugeridas.</div></div>" +
        '<h2 style="font-size:15px;margin:0 0 10px">Aguardando aprovação <span class="badge red plain">' + pending.length + "</span></h2>" +
        (pending.length ? pending.map(card).join("") : N.empty("Nenhuma pendência", "Não há solicitações de troca aguardando análise.", "swap")) +
        '<h2 style="font-size:15px;margin:24px 0 10px">Histórico de solicitações</h2>' +
        (history.length ? history.map(card).join("") : '<p class="small muted">Nenhuma solicitação analisada.</p>');
      return N.pageHead("Solicitações de troca", "Análise e decisão administrativa das trocas solicitadas.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-approve]"), function (b) {
        b.addEventListener("click", function () { decideSwapModal(b.getAttribute("data-approve"), "aprovada"); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-reject]"), function (b) {
        b.addEventListener("click", function () { decideSwapModal(b.getAttribute("data-reject"), "rejeitada"); });
      });
    }
  };

  function decideSwapModal(swapId, decision) {
    var s = N.state().swaps.find(function (x) { return x.id === swapId; });
    var ev = N.eventById(s.eventId);
    var body =
      '<div class="alert ' + (decision === "aprovada" ? "info" : "danger") + '">' + N.icon(decision === "aprovada" ? "check" : "alert") +
      "<div><b>" + esc(N.userName(s.requesterId)) + "</b> · " + esc(ev ? ev.name + " de " + U.fmtDate(ev.date) : "") + " · " + esc(N.roleName(s.teamId, s.roleId)) + "</div></div>" +
      "<p class=\"small muted\" style=\"margin:0 0 12px\">" + (decision === "aprovada"
        ? (s.suggestedUserId
          ? "Ao aprovar, a vaga será transferida para <b>" + esc(N.userName(s.suggestedUserId)) + "</b>, que deverá confirmar presença."
          : "Ao aprovar sem pessoa sugerida, a vaga ficará aberta para que o administrador a preencha na escala.")
        : "Ao rejeitar, a escala original é mantida e o voluntário será notificado.") + "</p>" +
      '<div class="field"><label>Observação para o voluntário (opcional)</label><textarea class="textarea" id="swap-note" placeholder="Mensagem que será registrada na solicitação."></textarea></div>';
    N.modal({
      title: decision === "aprovada" ? "Aprovar troca" : "Rejeitar troca",
      subtitle: "Decisão exclusiva do administrador",
      body: body,
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn ' + (decision === "aprovada" ? "btn-primary" : "btn-danger") + '" id="swap-decide">' + (decision === "aprovada" ? "Aprovar troca" : "Rejeitar troca") + "</button>",
      onMount: function (wrap) {
        wrap.querySelector("#swap-decide").addEventListener("click", function () {
          var note = wrap.querySelector("#swap-note").value.trim();
          var res = N.decideSwap(swapId, decision, note);
          if (!res.ok) { N.toast(res.message, "warn"); return; }
          N.closeModal();
          N.toast(decision === "aprovada" ? "Troca aprovada e registrada no histórico." : "Troca rejeitada. O voluntário foi notificado.", decision === "aprovada" ? "ok" : "warn");
          N.render();
        });
      }
    });
  }

  /* ================================ NOTIFICAÇÕES ================================ */
  var notifications = {
    render: function () {
      var all = scopedNotifications();
      var filters = [
        { id: "todas", label: "Todas" },
        { id: "nao-lidas", label: "Não lidas" },
        { id: "troca", label: "Trocas" },
        { id: "cadastro", label: "Cadastros" },
        { id: "resposta", label: "Escalas" },
        { id: "lgpd", label: "LGPD" },
        { id: "disponibilidade", label: "Disponibilidades" }
      ];
      var uidNow = N.currentUser().id;
      var list = all.slice();
      if (uiState.notifFilter === "nao-lidas") list = list.filter(function (n) { return (n.readBy || []).indexOf(uidNow) < 0; });
      else if (uiState.notifFilter !== "todas") list = list.filter(function (n) { return n.type === uiState.notifFilter; });

      var body =
        '<div class="row-between" style="margin-bottom:14px"><div class="chip-set">' +
          filters.map(function (f) {
            return '<button class="chip ' + (uiState.notifFilter === f.id ? "on" : "") + '" data-nfilter="' + f.id + '">' + esc(f.label) + "</button>";
          }).join("") +
        "</div>" +
        (N.isAdmin() ? '<button class="btn btn-ghost btn-sm" id="mark-read">Marcar todas como lidas</button>' : "") +
        "</div>" +
        '<div class="card">' + (list.length ? list.map(function (n) {
          var unread = (n.readBy || []).indexOf(uidNow) < 0;
          return '<div class="list-item"><div class="li-body"><div class="li-title">' + (unread ? '<span style="color:#ff5d70">● </span>' : "") + esc(n.title) + '</div><div class="li-sub">' + esc(n.text) + '</div>' +
            '<div class="tiny" style="margin-top:4px;letter-spacing:0;text-transform:none">' + (n.unit ? esc(N.unitName(n.unit)) + " · " : "") + esc(U.fmtDateTime(n.at)) + "</div></div>" +
            '<span class="badge gray plain">' + esc(n.type) + "</span></div>";
        }).join("") : N.empty("Nenhum aviso", "Não há notificações para os filtros selecionados.", "bell")) + "</div>";
      return N.pageHead("Notificações", "Avisos ao administrador sobre formulários, disponibilidades, escalas, trocas e acessos.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-nfilter]"), function (b) {
        b.addEventListener("click", function () { uiState.notifFilter = b.getAttribute("data-nfilter"); N.render(); });
      });
      var btn = document.getElementById("mark-read");
      if (btn) btn.addEventListener("click", function () {
        var uidNow = N.currentUser().id;
        scopedNotifications().forEach(function (n) {
          n.readBy = n.readBy || [];
          if (n.readBy.indexOf(uidNow) < 0) n.readBy.push(uidNow);
        });
        N.persist();
        N.render();
        N.toast("Notificações marcadas como lidas.", "ok");
      });
    }
  };

  /* ================================ HISTÓRICO ================================ */
  var history = {
    render: function () {
      if (!N.isAdmin()) return N.empty("Acesso restrito", "O histórico completo é exclusivo do administrador.", "shield");
      var list = N.state().audit.filter(function (a) { return !a.unit || N.canSeeUnit(a.unit); });
      if (uiState.historyQuery) {
        var q = uiState.historyQuery.toLowerCase();
        list = list.filter(function (a) {
          return (a.action + " " + a.target + " " + a.actorName).toLowerCase().indexOf(q) >= 0;
        });
      }
      var body =
        '<div class="card" style="padding:14px">' +
          '<div class="row" style="justify-content:space-between;margin-bottom:12px">' +
            '<input class="input" id="h-search" placeholder="Buscar por ação, alvo ou responsável" value="' + esc(uiState.historyQuery) + '" style="max-width:360px" />' +
            '<span class="small muted">' + list.length + " registro(s) · somente administradores</span>" +
          "</div>" +
          '<div class="table-wrap"><table class="data"><thead><tr><th>Data e hora</th><th>Responsável</th><th>Ação</th><th>Alvo</th><th>Unidade</th><th></th></tr></thead><tbody>' +
          (list.length ? list.map(function (a) {
            return '<tr class="expandable" data-audit-row="' + esc(a.id) + '"><td class="nowrap">' + esc(U.fmtDateTime(a.at)) + "</td><td>" + esc(a.actorName) + "</td><td><b>" + esc(a.action) + "</b></td><td>" + esc(a.target) + "</td><td>" + esc(N.unitName(a.unit, true)) + '</td><td class="text-right">' + N.icon("chevronDown") + "</td></tr>" +
              '<tr class="detail-row hidden" data-audit-detail="' + esc(a.id) + '"><td colspan="6"><div class="detail-box">' +
                '<div><div class="d-label">Dados anteriores</div><pre class="mono" style="margin:0;font-size:11px;white-space:pre-wrap;color:#b9bcc2">' + esc(a.before ? JSON.stringify(a.before, null, 2) : "—") + "</pre></div>" +
                '<div><div class="d-label">Dados posteriores</div><pre class="mono" style="margin:0;font-size:11px;white-space:pre-wrap;color:#b9bcc2">' + esc(a.after ? JSON.stringify(a.after, null, 2) : "—") + "</pre></div>" +
                '<div><div class="d-label">Identificação</div><div class="d-val mono" style="font-size:10.5px">' + esc(a.id) + "</div></div>" +
              "</div></td></tr>";
          }).join("") : '<tr><td colspan="6">' + N.empty("Nenhum registro", "As ações administrativas aparecerão aqui.", "history") + "</td></tr>") +
          "</tbody></table></div>" +
        "</div>" +
        '<div class="alert info" style="margin-top:14px">' + N.icon("history") + "<div>Cada registro contém o usuário responsável, a ação realizada, data/hora e, quando aplicável, os dados anteriores e posteriores à alteração.</div></div>";

      return N.pageHead("Histórico de atividades", "Auditoria completa das ações administrativas.", "") + body;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-audit-row]"), function (row) {
        row.addEventListener("click", function () {
          var d = document.querySelector('[data-audit-detail="' + row.getAttribute("data-audit-row") + '"]');
          if (d) d.classList.toggle("hidden");
        });
      });
      var s = document.getElementById("h-search");
      s.addEventListener("input", function () {
        uiState.historyQuery = s.value;
        N.render();
        var el = document.getElementById("h-search");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
  };

  N.views["painel"] = panel;
  N.views["usuarios"] = users;
  N.views["voluntarios"] = volunteers;
  N.views["equipes"] = teams;
  N.views["eventos"] = events;
  N.views["disponibilidades"] = availabilityAdmin;
  N.views["trocas"] = swaps;
  N.views["notificacoes"] = notifications;
  N.views["historico"] = history;

  N.adminUi = uiState;
  N.openUserModal = openUserModal;
})(window.AMI);
