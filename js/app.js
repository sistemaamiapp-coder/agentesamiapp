/* Estrutura do aplicativo, navegação e controle de acesso */
(function (N) {
  "use strict";
  var U = N.util;
  var esc = N.esc;

  var ROUTES = {
    painel: { title: "Painel", adminOnly: true },
    usuarios: { title: "Usuários", adminOnly: true },
    equipes: { title: "Equipes e funções", perm: "equipes" },
    eventos: { title: "Eventos", adminOnly: true },
    escalas: { title: "Escalas", perm: "escalas" },
    "escala-editor": { title: "Montagem de escala", perm: "escalas" },
    disponibilidades: { title: "Disponibilidades", perm: "disponibilidades" },
    trocas: { title: "Solicitações de troca", adminOnly: true },
    whatsapp: { title: "WhatsApp", perm: "whatsapp" },
    notificacoes: { title: "Notificações", adminOnly: true },
    historico: { title: "Histórico de atividades", adminOnly: true },
    manuais: { title: "Manuais" },
    "vol-painel": { title: "Meu painel", volOnly: true },
    "vol-disponibilidade": { title: "Minha disponibilidade", volOnly: true },
    "vol-escalas": { title: "Eventos e escalas", volOnly: true },
    "vol-troca": { title: "Solicitar troca", volOnly: true },
    "vol-perfil": { title: "Meu perfil", volOnly: true },
    "vol-manual": { title: "Manual do voluntário", volOnly: true }
  };

  var ui = { route: null, params: {}, sidebar: false };

  function canAccess(user, route) {
    var meta = ROUTES[route];
    if (!meta) return false;
    if (meta.adminOnly && user.role !== "admin") return false;
    if (meta.perm && !(user.role === "admin" || (user.permissions || []).indexOf(meta.perm) >= 0)) return false;
    if (meta.volOnly && user.role === "admin") return false;
    return true;
  }

  function defaultRoute(user) {
    return user.role === "admin" ? "painel" : "vol-painel";
  }

  function notifItems() {
    var user = N.currentUser();
    if (!user) return [];
    return N.state().notifications.filter(function (n) {
      if (n.audience === "user") return n.userId === user.id;
      return user.role === "admin" && (!n.unit || N.canSeeUnit(n.unit));
    });
  }

  function unreadCount() {
    var user = N.currentUser();
    if (!user) return 0;
    return notifItems().filter(function (n) { return (n.readBy || []).indexOf(user.id) < 0; }).length;
  }

  function navBadge(item) {
    var user = N.currentUser();
    if (!user) return 0;
    if (item.id === "trocas" && user.role === "admin") {
      return N.state().swaps.filter(function (s) { return s.status === "pendente" && N.canSeeUnit(s.unit); }).length;
    }
    if (item.id === "vol-escalas") {
      return N.assignmentsOf(user.id).filter(function (i) {
        return i.assignment.status === "pendente" && U.daysUntil(i.event.date) >= 0;
      }).length;
    }
    if (item.id === "usuarios" && user.role === "admin") {
      var scopeUsers = N.state().users.filter(function (u) { return u.units.some(function (x) { return N.canSeeUnit(x); }); });
      return scopeUsers.filter(function (u) { return u.status === "pendente"; }).length;
    }
    return 0;
  }

  function navConfig(user) {
    var isAdmin = user.role === "admin";
    var sections = [];
    if (isAdmin) {
      sections.push({ label: "Gestão", items: [
        { id: "painel", icon: "dashboard", label: "Painel" },
        { id: "usuarios", icon: "users", label: "Usuários" },
        { id: "equipes", icon: "teams", label: "Equipes" },
        { id: "eventos", icon: "calendar", label: "Eventos" },
        { id: "escalas", icon: "scale", label: "Escalas" },
        { id: "disponibilidades", icon: "clock", label: "Disponibilidades" },
        { id: "trocas", icon: "swap", label: "Solicitações de troca" }
      ]});
      sections.push({ label: "Comunicação", items: [
        { id: "whatsapp", icon: "whatsapp", label: "WhatsApp" },
        { id: "notificacoes", icon: "bell", label: "Notificações" }
      ]});
      sections.push({ label: "Sistema", items: [
        { id: "historico", icon: "history", label: "Histórico" },
        { id: "manuais", icon: "book", label: "Manuais" }
      ]});
      return sections;
    }

    sections.push({ label: "Meu espaço", items: [
      { id: "vol-painel", icon: "dashboard", label: "Meu painel" },
      { id: "vol-disponibilidade", icon: "calendar", label: "Minha disponibilidade" },
      { id: "vol-escalas", icon: "scale", label: "Eventos e escalas" },
      { id: "vol-troca", icon: "swap", label: "Solicitar troca" }
    ]});
    var coord = [];
    if (user.role === "dirigente") {
      if ((user.permissions || []).indexOf("equipes") >= 0) coord.push({ id: "equipes", icon: "teams", label: "Equipes" });
      if ((user.permissions || []).indexOf("escalas") >= 0) coord.push({ id: "escalas", icon: "scale", label: "Escalas" });
      if ((user.permissions || []).indexOf("disponibilidades") >= 0) coord.push({ id: "disponibilidades", icon: "clock", label: "Disponibilidades" });
      if ((user.permissions || []).indexOf("whatsapp") >= 0) coord.push({ id: "whatsapp", icon: "whatsapp", label: "WhatsApp" });
    }
    if (coord.length) sections.push({ label: "Coordenação", items: coord });
    sections.push({ label: "Apoio", items: [
      { id: "vol-manual", icon: "book", label: user.role === "dirigente" ? "Manual do dirigente" : "Manual do voluntário" },
      { id: "vol-perfil", icon: "user", label: "Meu perfil" }
    ]});
    return sections;
  }

  function shell(user, route, content) {
    var meta = ROUTES[route] || { title: "" };
    var session = N.getSession();
    var unread = unreadCount();
    var scope = N.scopeUnits();
    var showScope = user.role === "admin" && user.units.indexOf("pacheco") >= 0;
    var scopeValue = session.scope || "all";

    var nav = navConfig(user).map(function (sec) {
      return '<div class="nav-section"><div class="nav-label">' + esc(sec.label) + "</div>" +
        sec.items.map(function (item) {
          var badge = navBadge(item);
          return '<button class="nav-item ' + (ui.route === item.id ? "active" : "") + '" data-nav="' + item.id + '">' +
            N.icon(item.icon) + "<span>" + esc(item.label) + "</span>" +
            (badge > 0 ? '<span class="nav-badge">' + badge + "</span>" : "") + "</button>";
        }).join("") + "</div>";
    }).join("");

    return '<div class="shell">' +
      '<aside class="sidebar" id="sidebar">' +
        '<div class="brand"><img src="assets/fundo.jpeg" alt="Agentes do Amor AMI" />' +
          "<div><b>Agentes do Amor</b><span>AMI · Pacheco &amp; Amendoeira</span></div></div>" +
        '<nav>' + nav + "</nav>" +
        '<div class="sidebar-foot">Versão ' + esc(N.MANUAL_VERSION) + " · " + esc(N.MANUAL_DATE) + "<br/>Líder: Leon Dias<br/>Juntos por um servir ainda mais forte!</div>" +
      "</aside>" +
      '<div class="mobile-backdrop" id="backdrop"></div>' +
      '<div class="main">' +
        '<header class="topbar">' +
          '<button class="hamburger" id="hamburger" aria-label="Abrir menu">' + N.icon("menu") + "</button>" +
          '<div class="page-title">' + esc(meta.title) + ' <span>· ' + esc(user.role === "admin" ? "Administração" : user.role === "dirigente" ? "Direção" : "Voluntariado") + "</span></div>" +
          '<div class="topbar-right">' +
            (showScope
              ? '<label class="scope-pill"><i></i><span class="full">Unidade:</span><select id="scope-select" style="background:none;border:0;color:#e9eaec;font-size:11.5px;outline:none;padding:0">' +
                '<option value="all"' + (scopeValue === "all" ? " selected" : "") + ">Todas</option>" +
                '<option value="pacheco"' + (scopeValue === "pacheco" ? " selected" : "") + ">Pacheco</option>" +
                '<option value="amendoeira"' + (scopeValue === "amendoeira" ? " selected" : "") + ">Amendoeira</option>" +
                "</select></label>"
              : '<span class="scope-pill"><i></i>' + esc(scope.map(function (s) { return N.unitName(s, true); }).join(" / ")) + "</span>") +
            '<button class="btn btn-icon btn-ghost" id="bell" aria-label="Notificações" style="position:relative">' + N.icon("bell") +
              (unread ? '<span class="nav-badge" style="position:absolute;top:-4px;right:-4px;margin:0">' + unread + "</span>" : "") + "</button>" +
            '<div class="user-chip"><div class="meta"><b>' + esc(user.name.split(" ").slice(0, 2).join(" ")) + "</b><span>" + (user.role === "admin" ? "Administrador" : user.role === "dirigente" ? "Dirigente" : "Voluntário") + "</span></div>" +
              N.avatar(user.name) + "</div>" +
            '<button class="btn btn-icon btn-ghost" id="logout" title="Sair" aria-label="Sair">' + N.icon("logout") + "</button>" +
          "</div>" +
        "</header>" +
        '<main class="content" id="content">' + content + "</main>" +
      "</div></div>";
  }

  function render() {
    N.closeModal();
    var session = N.getSession();
    var app = document.getElementById("app");
    if (!session) {
      ui.route = null;
      N.auth.reset();
      document.title = "Agentes do Amor AMI";
      N.auth.loginScreen();
      return;
    }
    var user = N.currentUser();
    if (!user) {
      N.clearSession();
      N.auth.loginScreen();
      return;
    }
    if (user.lgpd.status !== "aceito") {
      document.title = "Acesso bloqueado · Agentes do Amor AMI";
      blockedScreen(user);
      return;
    }
    if (!user.firstAccess || !user.firstAccess.done) {
      document.title = "Primeiro acesso · Agentes do Amor AMI";
      N.auth.firstAccessScreen(user);
      return;
    }
    if (user.units.indexOf(session.unitId) < 0) {
      N.clearSession();
      N.auth.loginScreen();
      return;
    }
    try {
      var qs = new URLSearchParams(location.search);
      if (qs.get("usuario")) {
        if (qs.get("escala") && qs.get("usuario") === user.id && user.role !== "admin") ui.route = "vol-escalas";
        history.replaceState(null, "", location.pathname);
      }
    } catch (e) { /* sem suporte a query string */ }

    var route = ui.route || defaultRoute(user);
    if (!ROUTES[route] || !canAccess(user, route)) route = defaultRoute(user);
    ui.route = route;
    var view = N.views[route];
    if (!view) {
      app.innerHTML = shell(user, route, N.empty("Página não encontrada", "Selecione um item do menu.", "info"));
      return;
    }
    document.title = (ROUTES[route].title || "Agentes do Amor AMI") + " · Agentes do Amor AMI";
    app.innerHTML = shell(user, route, view.render(ui.params));
    bindShell(user);
    if (view.mount) view.mount(ui.params);
  }

  function blockedScreen(user) {
    document.getElementById("app").innerHTML =
      '<div class="auth" style="grid-template-columns:1fr"><section class="auth-panel">' +
        '<div class="auth-card" style="max-width:520px">' +
          '<div class="blocked-card">' +
            '<div class="blocked-icon">' + N.icon("shield") + "</div>" +
            "<h3>Acesso bloqueado</h3>" +
            "<p>O consentimento LGPD é obrigatório para utilizar as funcionalidades do sistema. Registre uma nova decisão ou solicite a liberação ao administrador.</p>" +
            '<div class="btn-group" style="justify-content:center;margin-top:18px">' +
              '<button class="btn btn-primary" id="ask-release">Solicitar liberação ao administrador</button>' +
              '<button class="btn btn-ghost" id="exit-blocked">Sair</button>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</section></div>";
    document.getElementById("ask-release").addEventListener("click", function () {
      N.requestAccessRelease(user.id);
      N.toast("Solicitação de liberação enviada ao administrador.", "ok");
      document.getElementById("ask-release").disabled = true;
      document.getElementById("ask-release").textContent = "Solicitação enviada";
    });
    document.getElementById("exit-blocked").addEventListener("click", function () {
      N.clearSession();
      render();
    });
  }

  function bindShell(user) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function (b) {
      b.addEventListener("click", function () { navigate(b.getAttribute("data-nav")); });
    });
    var scope = document.getElementById("scope-select");
    if (scope) scope.addEventListener("change", function () {
      var s = N.getSession();
      if (!s) return;
      s.scope = scope.value;
      s.lastSeen = new Date().toISOString();
      N.setSession(s);
      if (N.schedulesUi) { N.schedulesUi.builder.eventId = null; N.schedulesUi.listState.unit = "all"; }
      N.toast("Unidade de trabalho: " + (scope.value === "all" ? "todas" : N.unitName(scope.value, true)) + ".", "ok");
      N.render();
    });
    var bell = document.getElementById("bell");
    if (bell) bell.addEventListener("click", openNotifications);
    var logout = document.getElementById("logout");
    if (logout) logout.addEventListener("click", function () {
      N.confirm({
        title: "Sair do sistema",
        text: "Deseja encerrar a sessão?",
        confirmLabel: "Sair",
        onConfirm: function () {
          N.clearSession();
          ui.route = null;
          ui.params = {};
          N.toast("Sessão encerrada.", "ok");
          N.render();
        }
      });
    });
    var ham = document.getElementById("hamburger");
    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("backdrop");
    if (ham) ham.addEventListener("click", function () {
      sidebar.classList.add("open");
      backdrop.classList.add("show");
    });
    if (backdrop) backdrop.addEventListener("click", function () {
      sidebar.classList.remove("open");
      backdrop.classList.remove("show");
    });
  }

  function openNotifications() {
    var user = N.currentUser();
    var list = notifItems();
    var unread = list.filter(function (n) { return (n.readBy || []).indexOf(user.id) < 0; });
    N.modal({
      title: "Notificações",
      subtitle: unread.length ? unread.length + " não lida(s)" : "Tudo em dia",
      body: list.length ? list.slice(0, 40).map(function (n) {
        var isUnread = (n.readBy || []).indexOf(user.id) < 0;
        return '<div class="list-item"><div class="li-body"><div class="li-title">' + (isUnread ? '<span style="color:#ff5d70">● </span>' : "") + esc(n.title) + '</div>' +
          '<div class="li-sub">' + esc(n.text) + '</div><div class="tiny" style="margin-top:4px;letter-spacing:0;text-transform:none">' + (n.unit ? esc(N.unitName(n.unit, true)) + " · " : "") + esc(U.relative(n.at)) + "</div></div></div>";
      }).join("") : N.empty("Nenhuma notificação", "Os avisos do sistema aparecerão aqui.", "bell"),
      footer: (user.role === "admin" ? '<button class="btn btn-ghost" id="notif-center">Abrir central</button>' : "") + '<button class="btn btn-primary" data-close>Fechar</button>',
      onMount: function (wrap) {
        var center = wrap.querySelector("#notif-center");
        if (center) center.addEventListener("click", function () { N.closeModal(); navigate("notificacoes"); });
      }
    });
    list.forEach(function (n) {
      n.readBy = n.readBy || [];
      if (n.readBy.indexOf(user.id) < 0) n.readBy.push(user.id);
    });
    N.persist();
    var bell = document.getElementById("bell");
    if (bell) {
      var badge = bell.querySelector(".nav-badge");
      if (badge) badge.remove();
    }
  }

  function navigate(route, params) {
    ui.route = route;
    ui.params = params || {};
    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("backdrop");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("show");
    render();
  }

  function boot() {
    N.render = render;
    N.navigate = navigate;
    N.ui = ui;
    document.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) N.touchSession();
    });
    N.auth.reset();
    N.render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.AMI);
