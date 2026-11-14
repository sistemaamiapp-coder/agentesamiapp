/* Componentes de interface reutilizáveis */
(function (N) {
  "use strict";
  var U = N.util;

  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    volunteer: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    teams: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    scale: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.6 8.6 0 0 1-4.1-1L3 21l2.1-5.4a8.4 8.4 0 1 1 15.9-4.1z"/><path d="M8.5 9.2c.3 2.6 2.4 4.6 5 5 .5 0 1.1-.4 1.3-.9l.2-.6-1.7-.8-.7.7c-1-.4-1.8-1.2-2.2-2.2l.7-.7-.8-1.6-.6.1c-.6.2-1 .8-.9 1.4z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    pin: '<path d="M12 22s7-6.1 7-12A7 7 0 0 0 5 10c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="13" y2="18"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function icon(name, cls) {
    var p = ICONS[name] || ICONS.info;
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function avatar(name, cls) {
    return '<div class="avatar ' + (cls || "") + '">' + esc(U.initials(name)) + "</div>";
  }

  function avatarLg(name) { return avatar(name, "lg"); }

  function statusBadge(status, kind) {
    var map = {
      ativo: ["green", "Ativo"], pendente: ["amber", "Aguardando login"],
      bloqueado: ["red", "Acesso bloqueado"], inativo: ["gray", "Inativo"],
      confirmado: ["green", "Confirmado"], recusado: ["red", "Recusado"],
      vaga_aberta: ["amber", "Vaga aberta"], aprovada: ["green", "Aprovada"],
      rejeitada: ["red", "Rejeitada"], folga: ["amber", "Em folga"],
      liberado: ["green", "Liberado"], aceito: ["green", "Aceito"],
      pendente_lgpd: ["amber", "Pendente"], montada: ["blue", "Montada"]
    };
    if (kind === "assignment") map.pendente = ["amber", "Aguardando resposta"];
    if (kind === "swap") map.pendente = ["amber", "Aguardando aprovação"];
    var m = map[status] || ["gray", status];
    return '<span class="badge ' + m[0] + '">' + esc(m[1]) + "</span>";
  }

  function roleBadge(role) {
    var map = { admin: ["red", "Administrador"], dirigente: ["blue", "Dirigente"], voluntario: ["gray", "Voluntário"] };
    var m = map[role] || ["gray", role];
    return '<span class="badge plain ' + m[0] + '">' + m[1] + "</span>";
  }

  function unitBadges(unitIds, short) {
    return unitIds.map(function (id) {
      return '<span class="tag">' + esc(N.unitName(id, short)) + "</span>";
    }).join("");
  }

  /* ------------------------------ modal ------------------------------ */
  var modalRoot = null;
  function mountRoots() {
    modalRoot = modalRoot || document.getElementById("modal-root");
  }

  function modal(opts) {
    mountRoots();
    closeModal();
    var wrap = document.createElement("div");
    wrap.className = "modal-root";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    var cls = "modal" + (opts.wide ? " wide" : "") + (opts.narrow ? " narrow" : "");
    wrap.innerHTML =
      '<div class="' + cls + '">' +
        '<div class="modal-head">' +
          '<div><h3>' + esc(opts.title || "") + "</h3>" + (opts.subtitle ? "<p>" + esc(opts.subtitle) + "</p>" : "") + "</div>" +
          '<button class="x" type="button" data-close aria-label="Fechar">&times;</button>' +
        "</div>" +
        '<div class="modal-body">' + (opts.body || "") + "</div>" +
        (opts.footer ? '<div class="modal-foot">' + opts.footer + "</div>" : "") +
      "</div>";
    modalRoot.appendChild(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap || e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", escHandler);
    if (opts.onMount) opts.onMount(wrap);
    return wrap;
  }

  function escHandler(e) { if (e.key === "Escape") closeModal(); }

  function closeModal() {
    mountRoots();
    if (modalRoot) modalRoot.innerHTML = "";
    document.removeEventListener("keydown", escHandler);
  }

  function confirm(opts) {
    return modal({
      title: opts.title || "Confirmar",
      subtitle: opts.subtitle || "",
      narrow: true,
      body: '<p style="margin:0;font-size:13px;color:#c9ccd1;line-height:1.6">' + esc(opts.text || "") + "</p>",
      footer: '<button class="btn btn-ghost" data-close>Cancelar</button>' +
        '<button class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" id="confirm-yes">' + esc(opts.confirmLabel || "Confirmar") + "</button>",
      onMount: function (wrap) {
        wrap.querySelector("#confirm-yes").addEventListener("click", function () {
          closeModal();
          if (opts.onConfirm) opts.onConfirm();
        });
      }
    });
  }

  /* ------------------------------ toast ------------------------------ */
  function toast(message, type) {
    var root = document.getElementById("toast-root");
    if (!root) return;
    var el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = message;
    root.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity .25s";
      setTimeout(function () { el.remove(); }, 260);
    }, 4200);
  }

  /* ------------------------------ pedaços ------------------------------ */
  function pageHead(title, desc, actions) {
    return '<div class="page-head"><div><h1>' + esc(title) + "</h1>" +
      (desc ? '<p class="desc">' + desc + "</p>" : "") + "</div>" +
      (actions ? '<div class="btn-group no-print">' + actions + "</div>" : "") + "</div>";
  }

  function empty(title, text, iconName) {
    return '<div class="empty"><div class="glyph">' + icon(iconName || "info") + "</div><h4>" + esc(title) + "</h4><p>" + esc(text || "") + "</p></div>";
  }

  function kpi(label, value, foot, accent) {
    return '<div class="kpi ' + (accent ? "accent" : "") + '"><div class="k-label">' + esc(label) + '</div><div class="k-value">' + value + "</div>" +
      (foot ? '<div class="k-foot">' + foot + "</div>" : "") + "</div>";
  }

  function options(list, selected) {
    return list.map(function (o) {
      var val = o.value !== undefined ? o.value : o;
      var label = o.label !== undefined ? o.label : o;
      return '<option value="' + esc(val) + '"' + (String(val) === String(selected) ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
  }

  function formValues(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") {
        if (el.dataset.multi) {
          out[el.name] = out[el.name] || [];
          if (el.checked) out[el.name].push(el.value);
        } else {
          out[el.name] = el.checked;
        }
      } else if (el.type === "radio") {
        if (el.checked) out[el.name] = el.value;
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function initialsAvatarRow(name, sub) {
    return '<div class="cell-name">' + avatar(name) + '<div><div style="font-weight:600">' + esc(name) + "</div>" +
      (sub ? '<div class="tiny" style="text-transform:none;letter-spacing:0;margin-top:2px">' + esc(sub) + "</div>" : "") + "</div></div>";
  }

  N.esc = esc;
  N.icon = icon;
  N.avatar = avatar;
  N.avatarLg = avatarLg;
  N.statusBadge = statusBadge;
  N.roleBadge = roleBadge;
  N.unitBadges = unitBadges;
  N.modal = modal;
  N.closeModal = closeModal;
  N.confirm = confirm;
  N.toast = toast;
  N.pageHead = pageHead;
  N.empty = empty;
  N.kpi = kpi;
  N.options = options;
  N.formValues = formValues;
  N.initialsAvatarRow = initialsAvatarRow;
})(window.AMI);
