/* Agentes do Amor AMI - núcleo de dados, regras de negócio e persistência */
window.AMI = window.AMI || {};
(function (N) {
  "use strict";

  var STORAGE_KEY = "ami_state_v1";
  var SESSION_KEY = "ami_session_v1";
  var TERM_VERSION = "1.0";
  var MANUAL_VERSION = "1.2";
  var MANUAL_DATE = "14/11/2026";
  var LGPD_LAW = "Lei nº 13.709/2018";

  var MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var DOW = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  var DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  var UNITS = [
    { id: "pacheco", name: "AMI – Pacheco", short: "Pacheco", description: "Unidade principal" },
    { id: "amendoeira", name: "AMI – Amendoeira", short: "Amendoeira", description: "Administração local" }
  ];

  var PERMISSIONS = [
    { id: "equipes", label: "Acompanhar equipes e funções" },
    { id: "escalas", label: "Acompanhar escalas" },
    { id: "disponibilidades", label: "Consultar disponibilidades" },
    { id: "whatsapp", label: "Preparar mensagens no WhatsApp" }
  ];

  /* ------------------------------ utilidades ------------------------------ */
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) { var p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function todayISO() { return isoOf(new Date()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(monthKey, n) {
    var p = monthKey.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1 + n, 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }
  function monthOf(iso) { return String(iso).slice(0, 7); }
  function monthLabel(monthKey, opts) {
    var p = String(monthKey || "").split("-").map(Number);
    if (!p[0]) return "";
    var name = MONTHS[(p[1] || 1) - 1];
    return (opts && opts.short) ? (name + "/" + p[0]) : (name + " de " + p[0]);
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function fmtDateShort(iso) {
    var d = parseISO(iso);
    return DOW_SHORT[d.getDay()] + ", " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()];
  }
  function fmtDateLong(iso) {
    var d = parseISO(iso);
    return DOW[d.getDay()] + ", " + d.getDate() + " de " + MONTHS[d.getMonth()] + " de " + d.getFullYear();
  }
  function fmtDateTime(isoTs) {
    var d = new Date(isoTs);
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " às " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function relative(isoTs) {
    var diff = Date.now() - new Date(isoTs).getTime();
    var min = Math.round(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return "há " + min + " min";
    var h = Math.round(min / 60);
    if (h < 24) return "há " + h + "h";
    var d = Math.round(h / 24);
    if (d === 1) return "ontem";
    if (d < 30) return "há " + d + " dias";
    return fmtDateTime(isoTs);
  }
  function daysUntil(iso) {
    var a = parseISO(todayISO()).getTime();
    var b = parseISO(iso).getTime();
    return Math.round((b - a) / 86400000);
  }
  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  var seq = 0;
  function uid(prefix) {
    seq += 1;
    return prefix + "_" + Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function digits(v) { return String(v || "").replace(/\D/g, ""); }
  function sameDayEvent(a, b) { return a === b; }
  function monthDays(monthKey) {
    var p = monthKey.split("-").map(Number);
    return new Date(p[0], p[1], 0).getDate();
  }
  function calendarMatrix(monthKey) {
    var p = monthKey.split("-").map(Number);
    var first = new Date(p[0], p[1] - 1, 1);
    var start = first.getDay();
    var total = monthDays(monthKey);
    var cells = [];
    var i;
    for (i = 0; i < start; i++) cells.push(null);
    for (i = 1; i <= total; i++) cells.push(p[0] + "-" + pad(p[1]) + "-" + pad(i));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  function nextBankHoliday() { return null; }

  /* ------------------------------ estado ------------------------------ */
  var state = null;

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version) {
          state = parsed;
          migrate(state);
          persist();
          return state;
        }
      }
    } catch (e) { /* dados corrompidos: recria */ }
    state = seed();
    persist();
    return state;
  }

  function migrate(st) {
    st.settings = st.settings || {};
    st.settings.availabilityMonth = monthOf(todayISO());
    if (!st.settings.sessionHours) st.settings.sessionHours = 8;
    if (!st.settings.lgpdVersion) st.settings.lgpdVersion = TERM_VERSION;
    if (!st.settings.manualVersion) st.settings.manualVersion = MANUAL_VERSION;
    var targetEmail = "werleyvenceslau17@gmail.com";
    var users = st.users || [];
    var main = users.filter(function (u) { return u.email === targetEmail; })[0];
    var changed = false;
    var action = "";
    if (!main) {
      var legacy = users.filter(function (u) { return u.email === "admin@ami.com"; })[0];
      if (legacy) {
        legacy.name = "Werley Venceslau";
        legacy.email = targetEmail;
        legacy.role = "admin";
        legacy.units = ["pacheco", "amendoeira"];
        main = legacy;
        (st.audit || []).forEach(function (a) {
          if (a.actorId === legacy.id) a.actorName = "Werley Venceslau";
        });
        action = "Administrador principal atualizado";
      } else {
        main = {
          id: "u-werley", name: "Werley Venceslau", email: targetEmail, phone: "(11) 98888-1001",
          units: ["pacheco", "amendoeira"], role: "admin",
          teamIds: [], functions: [], permissions: [], conductor: "",
          status: "ativo",
          lgpd: { status: "pendente", at: null, version: (st.settings && st.settings.lgpdVersion) || TERM_VERSION },
          firstAccess: { done: true, at: new Date().toISOString(), month: monthOf(todayISO()) },
          createdAt: new Date().toISOString(), blockedReason: "", note: ""
        };
        users.push(main);
        action = "Administrador principal criado";
      }
      changed = true;
    } else if (main.role !== "admin" || main.units.indexOf("pacheco") < 0 || main.units.indexOf("amendoeira") < 0) {
      main.role = "admin";
      main.units = ["pacheco", "amendoeira"];
      action = "Administrador principal atualizado";
      changed = true;
    }
    var cesar = users.filter(function (u) { return u.email === "cesarigrejaami@gmail.com"; })[0];
    if (cesar) {
      if (cesar.role !== "admin" || cesar.units.length !== 1 || cesar.units[0] !== "amendoeira") {
        cesar.role = "admin";
        cesar.units = ["amendoeira"];
        if (!changed) action = "Acesso da Amendoeira ajustado";
        changed = true;
      }
    }
    if (changed) {
      st.audit = st.audit || [];
      st.audit.unshift({
        id: uid("au"), at: new Date().toISOString(), actorId: "sistema", actorName: "Sistema",
        action: action, target: "Werley Venceslau", unit: "pacheco",
        before: { email: "admin@ami.com", unidades: ["pacheco", "amendoeira"] },
        after: { email: targetEmail, unidades: ["pacheco", "amendoeira"] }
      });
    }
  }

  function S() { return state || load(); }

  function nextDow(dow, fromDate) {
    var d = new Date(fromDate);
    var diff = (dow - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return addDays(d, diff);
  }

  /* ------------------------------ seed ------------------------------ */
  function seed() {
    var now = new Date();
    var month = monthOf(todayISO());
    var st = {
      version: 1,
      createdAt: new Date().toISOString(),
      settings: {
        availabilityMonth: month,
        lgpdVersion: TERM_VERSION,
        manualVersion: MANUAL_VERSION,
        sessionHours: 8
      },
      units: UNITS.slice(),
      users: [],
      teams: [],
      events: [],
      schedules: [],
      availability: [],
      rests: [],
      swaps: [],
      notifications: [],
      audit: [],
      consents: [],
      accessRequests: [],
      messages: []
    };

    /* equipes e funções */
    var teams = [
      { id: "t-som-p", unit: "pacheco", name: "Som", roles: [
        { id: "r-p-audio", name: "Operador de áudio", vagas: 2 },
        { id: "r-p-auxsom", name: "Auxiliar de som", vagas: 1 } ] },
      { id: "t-proj-p", unit: "pacheco", name: "Projeção", roles: [
        { id: "r-p-proj", name: "Projeção", vagas: 2 } ] },
      { id: "t-rec-p", unit: "pacheco", name: "Recepção", roles: [
        { id: "r-p-rec", name: "Recepcionista", vagas: 4 } ] },
      { id: "t-louvor-p", unit: "pacheco", name: "Louvor", roles: [
        { id: "r-p-vocal", name: "Vocal", vagas: 3 },
        { id: "r-p-viola", name: "Violão", vagas: 1 },
        { id: "r-p-bateria", name: "Bateria", vagas: 1 } ] },
      { id: "t-com-p", unit: "pacheco", name: "Comunicação", roles: [
        { id: "r-p-camera", name: "Operador de câmera", vagas: 2 },
        { id: "r-p-foto", name: "Fotógrafo", vagas: 1 } ] },
      { id: "t-org-p", unit: "pacheco", name: "Organização", roles: [
        { id: "r-p-org", name: "Organização", vagas: 3 } ] },
      { id: "t-som-a", unit: "amendoeira", name: "Som", roles: [
        { id: "r-a-audio", name: "Operador de áudio", vagas: 2 } ] },
      { id: "t-proj-a", unit: "amendoeira", name: "Projeção", roles: [
        { id: "r-a-proj", name: "Projeção", vagas: 2 } ] },
      { id: "t-rec-a", unit: "amendoeira", name: "Recepção", roles: [
        { id: "r-a-rec", name: "Recepcionista", vagas: 4 } ] },
      { id: "t-louvor-a", unit: "amendoeira", name: "Louvor", roles: [
        { id: "r-a-vocal", name: "Vocal", vagas: 2 },
        { id: "r-a-teclado", name: "Teclado", vagas: 1 } ] },
      { id: "t-org-a", unit: "amendoeira", name: "Organização", roles: [
        { id: "r-a-org", name: "Organização", vagas: 2 } ] }
    ];
    st.teams = teams;

    /* usuários */
    function U(o) {
      return Object.assign({
        id: o.id, name: o.name, email: o.email, phone: o.phone,
        units: o.units, role: o.role, teamIds: o.teamIds || [],
        functions: o.functions || [], permissions: o.permissions || [],
        conductor: o.conductor || "",
        status: o.status || "ativo",
        lgpd: { status: "aceito", at: o.lgpdAt || "2026-10-02T13:20:00", version: TERM_VERSION },
        firstAccess: o.firstAccess && o.firstAccess.done === false ? { done: false } : { done: true, at: o.lgpdAt || "2026-10-02T13:20:00", month: month },
        createdAt: o.createdAt || "2026-09-15T10:00:00",
        blockedReason: o.blockedReason || "",
        note: o.note || ""
      }, o.extra || {});
    }

    st.users = [
      U({ id: "u-ana", name: "Werley Venceslau", email: "werleyvenceslau17@gmail.com", phone: "(11) 98888-1001",
          units: ["pacheco", "amendoeira"], role: "admin", teamIds: ["t-louvor-p"],
          functions: [{ teamId: "t-louvor-p", roleId: "r-p-vocal" }],
          conductor: "Pastor Elias", lgpdAt: "2026-09-20T09:00:00", createdAt: "2026-09-10T09:00:00" }),
      U({ id: "u-cesar", name: "César Almeida", email: "cesarigrejaami@gmail.com", phone: "(11) 97777-2002",
          units: ["amendoeira"], role: "admin", teamIds: [], functions: [],
          conductor: "Pastor Elias", lgpdAt: "2026-09-21T10:00:00", createdAt: "2026-09-10T09:10:00" }),
      U({ id: "u-leon", name: "Leon Dias", email: "leon@ami.com", phone: "(11) 96666-3003",
          units: ["pacheco"], role: "dirigente", teamIds: ["t-louvor-p", "t-som-p"],
          functions: [{ teamId: "t-louvor-p", roleId: "r-p-vocal" }, { teamId: "t-som-p", roleId: "r-p-audio" }],
          permissions: ["equipes", "escalas", "disponibilidades", "whatsapp"],
          conductor: "Pastor Elias", lgpdAt: "2026-09-22T11:00:00", createdAt: "2026-09-12T09:00:00" }),
      U({ id: "u-marcos", name: "Marcos Vinícius", email: "marcos@ami.com", phone: "(11) 95555-4004",
          units: ["amendoeira"], role: "dirigente", teamIds: ["t-rec-a", "t-org-a"],
          functions: [{ teamId: "t-rec-a", roleId: "r-a-rec" }, { teamId: "t-org-a", roleId: "r-a-org" }],
          permissions: ["escalas", "disponibilidades"], conductor: "Pastor Elias", lgpdAt: "2026-09-25T14:00:00", createdAt: "2026-09-12T09:20:00" }),
      U({ id: "u-debora", name: "Débora Lima", email: "debora@ami.com", phone: "(11) 94444-5005",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-proj-p"],
          functions: [{ teamId: "t-proj-p", roleId: "r-p-proj" }], conductor: "Pastor Elias", lgpdAt: "2026-09-28T16:00:00", createdAt: "2026-09-18T10:00:00" }),
      U({ id: "u-rafael", name: "Rafael Souza", email: "rafael@ami.com", phone: "(11) 93333-6006",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-som-p"],
          functions: [{ teamId: "t-som-p", roleId: "r-p-audio" }], conductor: "Pastor Elias", lgpdAt: "2026-09-28T16:10:00", createdAt: "2026-09-18T10:10:00" }),
      U({ id: "u-juliana", name: "Juliana Prado", email: "juliana@ami.com", phone: "(11) 92222-7007",
          units: ["pacheco", "amendoeira"], role: "voluntario", teamIds: ["t-rec-p", "t-louvor-a"],
          functions: [{ teamId: "t-rec-p", roleId: "r-p-rec" }, { teamId: "t-louvor-a", roleId: "r-a-vocal" }],
          conductor: "Pastor Elias", lgpdAt: "2026-09-29T09:30:00", createdAt: "2026-09-19T10:00:00" }),
      U({ id: "u-tiago", name: "Tiago Moreira", email: "tiago@ami.com", phone: "(11) 91111-8008",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-proj-p", "t-com-p"],
          functions: [{ teamId: "t-proj-p", roleId: "r-p-proj" }, { teamId: "t-com-p", roleId: "r-p-camera" }],
          conductor: "Pastor Elias", lgpdAt: "2026-09-29T10:30:00", createdAt: "2026-09-20T10:00:00" }),
      U({ id: "u-camila", name: "Camila Nunes", email: "camila@ami.com", phone: "(11) 98888-9009",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-rec-p"],
          functions: [{ teamId: "t-rec-p", roleId: "r-p-rec" }], conductor: "Pastor Elias", lgpdAt: "2026-09-30T11:30:00", createdAt: "2026-09-21T10:00:00" }),
      U({ id: "u-samuel", name: "Samuel Rocha", email: "samuel@ami.com", phone: "(11) 97777-1010",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-louvor-p"],
          functions: [{ teamId: "t-louvor-p", roleId: "r-p-bateria" }, { teamId: "t-louvor-p", roleId: "r-p-viola" }],
          conductor: "Pastor Elias", lgpdAt: "2026-09-30T12:30:00", createdAt: "2026-09-22T10:00:00" }),
      U({ id: "u-priscila", name: "Priscila Alves", email: "priscila@ami.com", phone: "(11) 96666-2020",
          units: ["amendoeira"], role: "voluntario", teamIds: ["t-rec-a", "t-louvor-a"],
          functions: [{ teamId: "t-rec-a", roleId: "r-a-rec" }, { teamId: "t-louvor-a", roleId: "r-a-vocal" }],
          conductor: "Pastor Elias", lgpdAt: "2026-10-01T09:30:00", createdAt: "2026-09-23T10:00:00" }),
      U({ id: "u-andre", name: "André Santos", email: "andre@ami.com", phone: "(11) 95555-3030",
          units: ["amendoeira"], role: "voluntario", teamIds: ["t-som-a", "t-proj-a"],
          functions: [{ teamId: "t-som-a", roleId: "r-a-audio" }, { teamId: "t-proj-a", roleId: "r-a-proj" }],
          conductor: "Pastor Elias", lgpdAt: "2026-10-01T10:30:00", createdAt: "2026-09-24T10:00:00" }),
      U({ id: "u-beatriz", name: "Beatriz Melo", email: "beatriz@ami.com", phone: "(11) 94444-4040",
          units: ["amendoeira"], role: "voluntario", teamIds: ["t-org-a"],
          functions: [{ teamId: "t-org-a", roleId: "r-a-org" }], conductor: "Pastor Elias", lgpdAt: "2026-10-02T10:30:00", createdAt: "2026-09-25T10:00:00" }),
      U({ id: "u-novo", name: "Daniel Farias", email: "novo@ami.com", phone: "(11) 93333-5050",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-org-p"],
          functions: [{ teamId: "t-org-p", roleId: "r-p-org" }], conductor: "",
          status: "pendente", firstAccess: { done: false }, createdAt: isoOf(addDays(todayISO(), -6)) + "T09:00:00",
          lgpd: { status: "pendente", at: null, version: TERM_VERSION } }),
      U({ id: "u-raquel", name: "Raquel Ferreira", email: "raquel@ami.com", phone: "(11) 92222-6060",
          units: ["pacheco"], role: "voluntario", teamIds: ["t-rec-p"],
          functions: [{ teamId: "t-rec-p", roleId: "r-p-rec" }], conductor: "Pastor Elias",
          status: "bloqueado", blockedReason: "Consentimento LGPD recusado em " + fmtDate(isoOf(addDays(todayISO(), -8))) + ".",
          lgpd: { status: "recusado", at: isoOf(addDays(todayISO(), -8)) + "T19:12:00", version: TERM_VERSION },
          createdAt: "2026-10-04T10:00:00" })
    ];

    /* eventos: próximas 3 quartas e 3 domingos de cada unidade */
    var events = [];
    ["pacheco", "amendoeira"].forEach(function (unit) {
      var wed = new Date(now);
      var sun = new Date(now);
      for (var i = 0; i < 3; i++) {
        wed = nextDow(3, i === 0 ? now : wed);
        var wDate = isoOf(wed);
        events.push({
          id: "ev-" + unit + "-w" + (i + 1), unit: unit, name: "Culto de Quarta-feira",
          date: wDate, time: "19:30",
          needs: unit === "pacheco" ? [
            { teamId: "t-som-p", roleId: "r-p-audio", vagas: 1 },
            { teamId: "t-proj-p", roleId: "r-p-proj", vagas: 1 },
            { teamId: "t-rec-p", roleId: "r-p-rec", vagas: 2 },
            { teamId: "t-louvor-p", roleId: "r-p-vocal", vagas: 2 },
            { teamId: "t-com-p", roleId: "r-p-camera", vagas: 1 },
            { teamId: "t-org-p", roleId: "r-p-org", vagas: 1 }
          ] : [
            { teamId: "t-som-a", roleId: "r-a-audio", vagas: 1 },
            { teamId: "t-proj-a", roleId: "r-a-proj", vagas: 1 },
            { teamId: "t-rec-a", roleId: "r-a-rec", vagas: 2 },
            { teamId: "t-louvor-a", roleId: "r-a-vocal", vagas: 1 }
          ],
          createdAt: "2026-10-20T09:00:00"
        });
      }
      var suns = [];
      for (var j = 0; j < 3; j++) {
        sun = nextDow(0, j === 0 ? now : sun);
        suns.push(isoOf(sun));
        events.push({
          id: "ev-" + unit + "-s" + (j + 1) + "m", unit: unit, name: "Culto da Manhã",
          date: isoOf(sun), time: "10:00",
          needs: unit === "pacheco" ? [
            { teamId: "t-som-p", roleId: "r-p-audio", vagas: 1 },
            { teamId: "t-proj-p", roleId: "r-p-proj", vagas: 1 },
            { teamId: "t-rec-p", roleId: "r-p-rec", vagas: 2 },
            { teamId: "t-louvor-p", roleId: "r-p-vocal", vagas: 2 },
            { teamId: "t-org-p", roleId: "r-p-org", vagas: 1 }
          ] : [
            { teamId: "t-som-a", roleId: "r-a-audio", vagas: 1 },
            { teamId: "t-proj-a", roleId: "r-a-proj", vagas: 1 },
            { teamId: "t-rec-a", roleId: "r-a-rec", vagas: 2 },
            { teamId: "t-louvor-a", roleId: "r-a-vocal", vagas: 1 }
          ],
          createdAt: "2026-10-20T09:00:00"
        });
        events.push({
          id: "ev-" + unit + "-s" + (j + 1) + "n", unit: unit, name: "Culto da Noite",
          date: isoOf(sun), time: "19:00",
          needs: unit === "pacheco" ? [
            { teamId: "t-som-p", roleId: "r-p-audio", vagas: 1 },
            { teamId: "t-proj-p", roleId: "r-p-proj", vagas: 1 },
            { teamId: "t-rec-p", roleId: "r-p-rec", vagas: 2 },
            { teamId: "t-louvor-p", roleId: "r-p-vocal", vagas: 2 },
            { teamId: "t-com-p", roleId: "r-p-camera", vagas: 1 }
          ] : [
            { teamId: "t-som-a", roleId: "r-a-audio", vagas: 1 },
            { teamId: "t-proj-a", roleId: "r-a-proj", vagas: 1 },
            { teamId: "t-rec-a", roleId: "r-a-rec", vagas: 2 },
            { teamId: "t-louvor-a", roleId: "r-a-vocal", vagas: 1 }
          ],
          createdAt: "2026-10-20T09:00:00"
        });
      }
    });
    events.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    st.events = events;

    /* escalas iniciais */
    function A(userId, teamId, roleId, status) {
      return { id: uid("as"), userId: userId, teamId: teamId, roleId: roleId, status: status || "pendente", respondedAt: null, note: "" };
    }
    function findEvent(unit, date, time) {
      return events.find(function (e) { return e.unit === unit && e.date === date && e.time === time; });
    }
    function makeSchedule(ev, assignments) {
      return {
        id: "sc-" + ev.id, eventId: ev.id, unit: ev.unit,
        assignments: assignments, createdAt: "2026-10-25T09:00:00",
        updatedAt: "2026-10-25T09:00:00", status: "montada"
      };
    }
    var pWed = events.find(function (e) { return e.unit === "pacheco" && e.name === "Culto de Quarta-feira"; });
    var pSunM = events.find(function (e) { return e.unit === "pacheco" && e.name === "Culto da Manhã"; });
    var pSunN = events.find(function (e) { return e.unit === "pacheco" && e.name === "Culto da Noite"; });
    var aWed = events.find(function (e) { return e.unit === "amendoeira" && e.name === "Culto de Quarta-feira"; });

    if (pWed) {
      st.schedules.push(makeSchedule(pWed, [
        A("u-debora", "t-proj-p", "r-p-proj", "confirmado"),
        A("u-rafael", "t-som-p", "r-p-audio", "pendente"),
        A("u-juliana", "t-rec-p", "r-p-rec", "confirmado"),
        A("u-camila", "t-rec-p", "r-p-rec", "pendente"),
        A("u-samuel", "t-louvor-p", "r-p-vocal", "confirmado"),
        A(null, "t-louvor-p", "r-p-vocal", "vaga_aberta"),
        A(null, "t-com-p", "r-p-camera", "vaga_aberta")
      ]));
    }
    if (pSunM) {
      st.schedules.push(makeSchedule(pSunM, [
        A("u-debora", "t-proj-p", "r-p-proj", "pendente"),
        A("u-camila", "t-rec-p", "r-p-rec", "confirmado"),
        A("u-samuel", "t-louvor-p", "r-p-vocal", "pendente"),
        A("u-rafael", "t-som-p", "r-p-audio", "confirmado")
      ]));
    }
    if (pSunN) {
      st.schedules.push(makeSchedule(pSunN, [
        A("u-debora", "t-proj-p", "r-p-proj", "confirmado"),
        A("u-juliana", "t-rec-p", "r-p-rec", "pendente"),
        A("u-tiago", "t-com-p", "r-p-camera", "confirmado")
      ]));
    }
    if (aWed) {
      st.schedules.push(makeSchedule(aWed, [
        A("u-priscila", "t-rec-a", "r-a-rec", "pendente"),
        A("u-andre", "t-som-a", "r-a-audio", "confirmado"),
        A("u-beatriz", "t-org-a", "r-a-org", "pendente")
      ]));
    }

    /* disponibilidades do mês corrente (dias de evento entram automaticamente) */
    var eventDates = {};
    events.forEach(function (e) { if (monthOf(e.date) === month) eventDates[e.date] = true; });
    var volunteers = st.users.filter(function (u) { return u.role !== "admin" && u.status !== "pendente"; });
    volunteers.forEach(function (u, idx) {
      var days = [];
      var total = monthDays(month);
      for (var d = 2; d <= total; d++) {
        var iso = month + "-" + pad(d);
        var isEvent = !!eventDates[iso];
        if (!isEvent && (d + idx) % 3 === 0) continue;
        days.push(d);
      }
      st.availability.push({
        id: uid("av"), userId: u.id, month: month, days: days,
        submittedAt: "2026-10-30T20:00:00", locked: true
      });
    });

    /* folga automática (Débora completou 3 serviços) */
    st.rests.push({
      id: uid("rs"), userId: "u-debora", month: month, status: "folga",
      reason: "Três serviços no mês — folga automática", createdAt: "2026-10-31T08:00:00",
      releasedBy: null, releasedAt: null
    });

    /* solicitação de troca pendente */
    if (pSunN) {
      st.swaps.push({
        id: "sw-1", scheduleId: "sc-" + pSunN.id, eventId: pSunN.id, unit: "pacheco",
        requesterId: "u-juliana", assignmentId: st.schedules.find(function (s) { return s.id === "sc-" + pSunN.id; }).assignments[1].id,
        roleId: "r-p-rec", teamId: "t-rec-p",
        reason: "Viagem de trabalho no fim de semana.", suggestedUserId: "u-camila",
        status: "pendente", createdAt: isoOf(addDays(todayISO(), -5)) + "T18:40:00",
        decidedAt: null, decidedBy: null, adminNote: ""
      });
    }

    /* notificações */
    st.notifications = [
      { id: uid("nt"), at: isoOf(addDays(todayISO(), -5)) + "T18:40:00", type: "troca", audience: "admin", unit: "pacheco",
        title: "Nova solicitação de troca", text: "Juliana Prado solicitou troca no Culto da Noite.", userId: null, readBy: [] },
      { id: uid("nt"), at: isoOf(addDays(todayISO(), -6)) + "T09:20:00", type: "cadastro", audience: "admin", unit: "pacheco",
        title: "Novo formulário recebido", text: "Daniel Farias foi cadastrado e aguarda o primeiro acesso.", userId: null, readBy: [] },
      { id: uid("nt"), at: isoOf(addDays(todayISO(), -7)) + "T21:10:00", type: "disponibilidade", audience: "admin", unit: "amendoeira",
        title: "Disponibilidade enviada", text: "Priscila Alves enviou a disponibilidade do mês.", userId: null, readBy: [] },
      { id: uid("nt"), at: isoOf(addDays(todayISO(), -8)) + "T20:00:00", type: "lgpd", audience: "admin", unit: "pacheco",
        title: "Consentimento LGPD recusado", text: "Raquel Ferreira recusou o termo e teve o acesso bloqueado.", userId: null, readBy: [] }
    ];

    /* histórico inicial */
    st.audit = [
      { id: uid("au"), at: isoOf(addDays(todayISO(), -20)) + "T09:00:00", actorId: "u-ana", actorName: "Werley Venceslau",
        action: "Escala criada", target: "Culto de Quarta-feira", unit: "pacheco", before: null,
        after: { voluntários: 5, vagas_abertas: 2 } },
      { id: uid("au"), at: isoOf(addDays(todayISO(), -15)) + "T20:00:00", actorId: "u-juliana", actorName: "Juliana Prado",
        action: "Disponibilidade enviada", target: monthLabel(month), unit: "pacheco", before: null, after: { dias: 14 } },
      { id: uid("au"), at: isoOf(addDays(todayISO(), -14)) + "T08:00:00", actorId: "sistema", actorName: "Sistema",
        action: "Folga automática aplicada", target: "Débora Lima", unit: "pacheco", before: { folga: false }, after: { folga: true, serviços: 3 } }
    ];

    st.consents = st.users.filter(function (u) { return u.lgpd.status === "aceito"; }).map(function (u) {
      return { id: uid("lg"), userId: u.id, status: "aceito", at: u.lgpd.at, version: TERM_VERSION };
    });
    st.consents.push({ id: uid("lg"), userId: "u-raquel", status: "recusado", at: isoOf(addDays(todayISO(), -8)) + "T19:12:00", version: TERM_VERSION });

    return st;
  }

  /* ------------------------------ consultas ------------------------------ */
  function userById(id) { return S().users.find(function (u) { return u.id === id; }) || null; }
  function teamById(id) { return S().teams.find(function (t) { return t.id === id; }) || null; }
  function eventById(id) { return S().events.find(function (e) { return e.id === id; }) || null; }
  function scheduleByEvent(eventId) { return S().schedules.find(function (s) { return s.eventId === eventId; }) || null; }
  function roleOf(teamId, roleId) {
    var t = teamById(teamId);
    return t ? t.roles.find(function (r) { return r.id === roleId; }) || null : null;
  }
  function roleName(teamId, roleId) {
    var r = roleOf(teamId, roleId);
    return r ? (teamById(teamId).name + " · " + r.name) : "Função";
  }
  function unitName(id, short) {
    var u = S().units.find(function (x) { return x.id === id; });
    return u ? (short ? u.short : u.name) : id;
  }
  function userName(id) { var u = userById(id); return u ? u.name : "Vaga aberta"; }
  function dayName(iso) { var d = parseISO(iso); return DOW[d.getDay()]; }

  /* ------------------------------ sessão ------------------------------ */
  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      var hours = Number(S().settings.sessionHours || 8);
      if (!s.lastSeen || Date.now() - new Date(s.lastSeen).getTime() > hours * 3600000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      if (!userById(s.userId)) { localStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function touchSession() {
    var s = getSession();
    if (s) { s.lastSeen = new Date().toISOString(); setSession(s); }
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function currentUser() {
    var s = getSession();
    return s ? userById(s.userId) : null;
  }
  function scopeUnits(forceAll) {
    var u = currentUser();
    if (!u) return [];
    var s = getSession() || {};
    if (u.role === "admin" && u.units.indexOf("pacheco") >= 0) {
      if (s.scope === "pacheco") return ["pacheco"];
      if (s.scope === "amendoeira") return ["amendoeira"];
      return ["pacheco", "amendoeira"];
    }
    if (forceAll) return u.units.slice();
    return s.unitId && u.units.indexOf(s.unitId) >= 0 ? [s.unitId] : u.units.slice();
  }
  function canSeeUnit(unitId) { return scopeUnits().indexOf(unitId) >= 0; }
  function isAdmin() { var u = currentUser(); return !!u && u.role === "admin"; }
  function isDirigente() { var u = currentUser(); return !!u && u.role === "dirigente"; }
  function hasPermission(perm) {
    var u = currentUser();
    if (!u) return false;
    if (u.role === "admin") return true;
    return (u.permissions || []).indexOf(perm) >= 0;
  }
  function canManageUsers() { return isAdmin(); }

  /* ------------------------------ regras de serviço ------------------------------ */
  function serviceCount(userId, month) {
    var count = 0;
    S().schedules.forEach(function (sc) {
      var ev = eventById(sc.eventId);
      if (!ev || monthOf(ev.date) !== month) return;
      sc.assignments.forEach(function (a) {
        if (a.userId === userId && a.status !== "recusado" && a.status !== "vaga_aberta") count++;
      });
    });
    return count;
  }
  function assignmentsOf(userId) {
    var list = [];
    S().schedules.forEach(function (sc) {
      var ev = eventById(sc.eventId);
      if (!ev) return;
      sc.assignments.forEach(function (a) {
        if (a.userId === userId) list.push({ schedule: sc, event: ev, assignment: a });
      });
    });
    list.sort(function (a, b) { return (a.event.date + a.event.time).localeCompare(b.event.date + b.event.time); });
    return list;
  }
  function restRecord(userId, month) {
    return S().rests.find(function (r) { return r.userId === userId && r.month === month; }) || null;
  }
  function isOnRest(userId, month) {
    var r = restRecord(userId, month);
    return !!r && r.status === "folga";
  }
  function conflicts(userId, event) {
    var found = [];
    S().schedules.forEach(function (sc) {
      var ev = eventById(sc.eventId);
      if (!ev || ev.id === event.id) return;
      if (ev.date === event.date && ev.time === event.time) {
        sc.assignments.forEach(function (a) {
          if (a.userId === userId) found.push(ev);
        });
      }
    });
    return found;
  }
  function availabilityFor(userId, month) {
    return S().availability.find(function (a) { return a.userId === userId && a.month === month; }) || null;
  }
  function isAvailable(userId, event) {
    var av = availabilityFor(userId, monthOf(event.date));
    if (!av) return null;
    var day = Number(event.date.slice(8, 10));
    return av.days.indexOf(day) >= 0;
  }
  function refreshRests(month) {
    var users = S().users.filter(function (u) { return u.role !== "admin"; });
    users.forEach(function (u) {
      var count = serviceCount(u.id, month);
      var rec = restRecord(u.id, month);
      if (count >= 3 && !rec) {
        S().rests.push({
          id: uid("rs"), userId: u.id, month: month, status: "folga",
          reason: "Três serviços no mês — folga automática",
          createdAt: new Date().toISOString(), releasedBy: null, releasedAt: null
        });
        notify({
          title: "Folga automática", audience: "admin", unit: u.units[0], type: "folga",
          text: u.name + " completou três serviços em " + monthLabel(month) + " e entrou em folga."
        });
        audit("Folga automática aplicada", u.name, null, { serviços: count, folga: true });
      }
    });
  }
  function releaseRest(userId, month) {
    var rec = restRecord(userId, month);
    var before = rec ? { status: rec.status } : null;
    if (!rec) {
      rec = { id: uid("rs"), userId: userId, month: month, status: "liberado", createdAt: new Date().toISOString() };
      S().rests.push(rec);
    }
    rec.status = "liberado";
    rec.releasedAt = new Date().toISOString();
    var admin = currentUser();
    rec.releasedBy = admin ? admin.id : null;
    rec.reason = "Liberação administrativa";
    audit("Folga liberada", userName(userId), before, { status: "liberado" });
    var u = userById(userId);
    if (u) notify({
      title: "Folga liberada", audience: "user", userId: userId, unit: u.units[0], type: "folga",
      text: "Sua folga de " + monthLabel(month) + " foi liberada. Você já pode ser escalado novamente."
    });
  }

  /* ------------------------------ notificações / auditoria ------------------------------ */
  function notify(o) {
    var n = {
      id: uid("nt"), at: new Date().toISOString(), type: o.type || "geral",
      audience: o.audience || "admin", unit: o.unit || null,
      title: o.title || "Aviso", text: o.text || "", userId: o.userId || null, readBy: []
    };
    S().notifications.unshift(n);
    persist();
    return n;
  }
  function audit(action, target, before, after, unit) {
    var u = currentUser();
    S().audit.unshift({
      id: uid("au"), at: new Date().toISOString(),
      actorId: u ? u.id : "sistema",
      actorName: u ? u.name : "Sistema",
      action: action, target: target || "—",
      unit: unit || (u && u.units[0]) || "pacheco",
      before: before === undefined ? null : before,
      after: after === undefined ? null : after
    });
    persist();
  }

  /* ------------------------------ LGPD / autenticação ------------------------------ */
  function termVersion() {
    var st = S();
    return (st.settings && st.settings.lgpdVersion) || TERM_VERSION;
  }
  function recordConsent(userId, status) {
    var u = userById(userId);
    if (!u) return;
    var previous = u.lgpd ? u.lgpd.status : null;
    var ver = termVersion();
    u.lgpd = { status: status, at: new Date().toISOString(), version: ver };
    S().consents.unshift({ id: uid("lg"), userId: userId, status: status, at: u.lgpd.at, version: ver });
    if (status === "aceito") {
      if (u.status === "bloqueado" && /LGPD/i.test(u.blockedReason || "")) {
        u.status = "ativo";
        u.blockedReason = "";
      }
      audit("Consentimento LGPD aceito", u.name, { status: previous }, { status: "aceito", versão: ver });
    } else {
      u.status = "bloqueado";
      u.blockedReason = "Consentimento LGPD recusado em " + fmtDate(todayISO()) + ".";
      audit("Consentimento LGPD recusado", u.name, { status: previous }, { status: "recusado" });
      notify({
        title: "Consentimento LGPD recusado", audience: "admin", unit: u.units[0], type: "lgpd",
        text: u.name + " recusou o termo de tratamento de dados. O acesso foi bloqueado."
      });
    }
    persist();
  }

  function login(email, unitId, consent) {
    var mail = String(email || "").trim().toLowerCase();
    if (!mail) return { ok: false, message: "Informe o seu e-mail de acesso." };
    if (!unitId) return { ok: false, message: "Selecione a unidade de acesso." };
    var u = S().users.find(function (x) { return x.email.toLowerCase() === mail; });
    if (!u) return { ok: false, message: "E-mail não encontrado. Somente administradores cadastram novos usuários." };
    if (u.units.indexOf(unitId) < 0) {
      return { ok: false, message: "Este e-mail não possui acesso à unidade " + unitName(unitId) + "." };
    }
    if (consent === "recusado") {
      recordConsent(u.id, "recusado");
      return { ok: false, blocked: true, message: "Acesso bloqueado: o consentimento LGPD é obrigatório para utilizar o sistema. Você poderá solicitar a liberação ao administrador." };
    }
    if (u.status === "bloqueado") {
      return { ok: false, blocked: true, message: u.blockedReason || "Acesso bloqueado. Solicite a liberação ao administrador." };
    }
    if (u.lgpd.status !== "aceito") {
      if (consent !== "aceito") return { ok: false, message: "É necessário autorizar o tratamento de dados (LGPD) para entrar." };
      recordConsent(u.id, "aceito");
    }
    var firstLogin = u.status === "pendente";
    if (firstLogin) {
      u.status = "ativo";
      audit("Primeiro login realizado", u.name, { status: "pendente" }, { status: "ativo" });
      notify({
        title: "Primeiro acesso realizado", audience: "admin", unit: unitId, type: "acesso",
        text: u.name + " entrou no sistema pela primeira vez."
      });
    }
    setSession({
      userId: u.id, unitId: unitId,
      scope: u.role === "admin" && u.units.indexOf("pacheco") >= 0 ? "all" : unitId,
      startedAt: new Date().toISOString(), lastSeen: new Date().toISOString()
    });
    persist();
    return { ok: true, user: u, firstLogin: firstLogin };
  }

  function requestAccessRelease(userId) {
    var u = userById(userId);
    if (!u) return null;
    var existing = S().accessRequests.find(function (r) { return r.userId === userId && r.status === "pendente"; });
    if (!existing) {
      S().accessRequests.unshift({ id: uid("ar"), userId: userId, at: new Date().toISOString(), status: "pendente" });
    }
    audit("Liberação de acesso solicitada", u.name, { acesso: "bloqueado" }, { acesso: "liberação solicitada" });
    notify({
      title: "Pedido de liberação de acesso", audience: "admin", unit: u.units[0], type: "acesso",
      text: u.name + " solicitou a liberação do acesso após recusar o termo LGPD."
    });
    persist();
    return true;
  }

  function releaseAccess(userId) {
    var u = userById(userId);
    if (!u) return;
    var before = { status: u.status, lgpd: u.lgpd.status };
    u.status = u.status === "bloqueado" ? "ativo" : u.status;
    u.lgpd = { status: "pendente", at: null, version: termVersion() };
    u.blockedReason = "";
    S().accessRequests.forEach(function (r) {
      if (r.userId === userId && r.status === "pendente") { r.status = "atendida"; r.answeredAt = new Date().toISOString(); }
    });
    audit("Acesso liberado para novo consentimento", u.name, before, { status: u.status, lgpd: "pendente" });
    notify({
      title: "Acesso liberado", audience: "user", userId: userId, unit: u.units[0], type: "acesso",
      text: "Seu acesso foi liberado pelo administrador. Entre novamente e registre sua decisão sobre a LGPD."
    });
    persist();
  }

  function completeFirstAccess(userId, data) {
    var u = userById(userId);
    if (!u) return false;
    if (u.firstAccess && u.firstAccess.done) return false;
    u.name = data.name.trim();
    u.phone = data.phone.trim();
    u.units = data.units.slice();
    u.conductor = (data.conductor || "").trim();
    u.firstAccess = { done: true, at: new Date().toISOString(), month: data.month, consent: !!data.consent };
    u.status = "ativo";
    audit("Formulário de primeiro acesso enviado", u.name, null, {
      unidades: data.units, condutor: u.conductor, mês: data.month, consentimento: true
    });
    notify({
      title: "Novo formulário recebido", audience: "admin", unit: data.units[0], type: "cadastro",
      text: u.name + " concluiu o formulário obrigatório de primeiro acesso."
    });
    persist();
    return true;
  }

  /* ------------------------------ disponibilidade ------------------------------ */
  function saveAvailability(userId, month, days) {
    var existing = availabilityFor(userId, month);
    if (existing) return { ok: false, message: "A disponibilidade deste mês já foi enviada e não pode ser alterada." };
    var u = userById(userId);
    var merged = days.slice();
    S().events.forEach(function (e) {
      if (u.units.indexOf(e.unit) >= 0 && monthOf(e.date) === month) merged.push(Number(e.date.slice(8, 10)));
    });
    var unique = merged.filter(function (d, i, arr) { return arr.indexOf(d) === i; });
    var rec = {
      id: uid("av"), userId: userId, month: month,
      days: unique.sort(function (a, b) { return a - b; }),
      submittedAt: new Date().toISOString(), locked: true
    };
    S().availability.push(rec);
    audit("Disponibilidade enviada", monthLabel(month), null, { dias: rec.days.length });
    notify({
      title: "Nova disponibilidade recebida", audience: "admin", unit: userById(userId).units[0], type: "disponibilidade",
      text: userById(userId).name + " enviou a disponibilidade de " + monthLabel(month) + " (" + rec.days.length + " dias)."
    });
    persist();
    return { ok: true, record: rec };
  }

  /* ------------------------------ escalas ------------------------------ */
  function saveSchedule(eventId, assignments) {
    var ev = eventById(eventId);
    if (!ev) return { ok: false, message: "Evento não encontrado." };
    var sc = scheduleByEvent(eventId);
    var before = sc ? JSON.parse(JSON.stringify(sc.assignments)) : null;
    if (!sc) {
      sc = { id: "sc-" + eventId, eventId: eventId, unit: ev.unit, assignments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "montada" };
      S().schedules.push(sc);
    }
    sc.assignments = assignments;
    sc.updatedAt = new Date().toISOString();
    audit(sc && before ? "Escala atualizada" : "Escala montada", ev.name + " · " + fmtDate(ev.date), before, {
      voluntários: assignments.filter(function (a) { return a.userId; }).length,
      vagas_abertas: assignments.filter(function (a) { return !a.userId; }).length
    }, ev.unit);
    refreshRests(monthOf(ev.date));
    persist();
    return { ok: true, schedule: sc };
  }

  function respondAssignment(scheduleId, assignmentId, status) {
    var sc = S().schedules.find(function (s) { return s.id === scheduleId; });
    if (!sc) return { ok: false, message: "Escala não encontrada." };
    var a = sc.assignments.find(function (x) { return x.id === assignmentId; });
    if (!a) return { ok: false, message: "Escala não encontrada." };
    if (a.status === "confirmado" || a.status === "recusado") {
      return { ok: false, message: "Esta resposta já foi registrada e não pode ser alterada." };
    }
    var ev = eventById(sc.eventId);
    a.status = status;
    a.respondedAt = new Date().toISOString();
    sc.updatedAt = a.respondedAt;
    var u = userById(a.userId);
    audit(status === "confirmado" ? "Presença confirmada" : "Presença recusada",
      (u ? u.name : "Voluntário") + " · " + (ev ? ev.name : ""), { status: "pendente" }, { status: status }, ev ? ev.unit : null);
    var admins = S().users.filter(function (x) { return x.role === "admin"; });
    notify({
      title: status === "confirmado" ? "Presença confirmada" : "Presença recusada",
      audience: "admin", unit: ev ? ev.unit : null, type: "resposta",
      text: (u ? u.name : "Voluntário") + " " + (status === "confirmado" ? "confirmou" : "recusou") + " presença em " + (ev ? ev.name + " de " + fmtDate(ev.date) : "escala") + "."
    });
    refreshRests(ev ? monthOf(ev.date) : monthOf(todayISO()));
    persist();
    return { ok: true, assignment: a };
  }

  function swapRequestsInMonth(userId, month) {
    return S().swaps.filter(function (s) {
      return s.requesterId === userId && monthOf((s.createdAt || "").slice(0, 10)) === month && s.status !== "cancelada";
    });
  }

  function requestSwap(o) {
    var ev = eventById(o.eventId);
    if (!ev) return { ok: false, message: "Evento não encontrado." };
    var sc = scheduleByEvent(ev.id);
    if (!sc) return { ok: false, message: "Escala não encontrada." };
    var a = sc.assignments.find(function (x) { return x.id === o.assignmentId; });
    if (!a || a.userId !== o.userId) return { ok: false, message: "Escala não encontrada." };
    var diff = daysUntil(ev.date);
    if (diff <= 1) return { ok: false, message: "Não é possível solicitar troca faltando um dia (ou menos) para o evento." };
    var month = monthOf(todayISO());
    var used = swapRequestsInMonth(o.userId, month).filter(function (s) { return s.status !== "rejeitada"; });
    if (used.length >= 2) return { ok: false, message: "Limite de duas solicitações de troca por mês atingido." };
    if (o.suggestedUserId) {
      var already = sc.assignments.some(function (x) { return x.userId === o.suggestedUserId; });
      if (already) return { ok: false, message: "A pessoa sugerida já está escalada neste mesmo evento." };
      if (o.suggestedUserId === o.userId) return { ok: false, message: "Selecione outra pessoa para a troca." };
    }
    if (!o.reason || !o.reason.trim()) return { ok: false, message: "Informe o motivo da troca." };
    var sw = {
      id: uid("sw"), scheduleId: sc.id, eventId: ev.id, unit: ev.unit,
      requesterId: o.userId, assignmentId: a.id, roleId: a.roleId, teamId: a.teamId,
      reason: o.reason.trim(), suggestedUserId: o.suggestedUserId || null,
      status: "pendente", createdAt: new Date().toISOString(),
      decidedAt: null, decidedBy: null, adminNote: ""
    };
    S().swaps.unshift(sw);
    audit("Troca solicitada", userName(o.userId) + " · " + ev.name, null, {
      motivo: sw.reason, sugerido: sw.suggestedUserId ? userName(sw.suggestedUserId) : "não informado"
    }, ev.unit);
    var admins = S().users.filter(function (u) { return u.role === "admin" && u.units.indexOf(ev.unit) >= 0; });
    notify({
      title: "Solicitação de troca", audience: "admin", unit: ev.unit, type: "troca",
      text: userName(o.userId) + " pediu troca em " + ev.name + " (" + fmtDate(ev.date) + "). Motivo: " + sw.reason
    });
    persist();
    return { ok: true, swap: sw, admins: admins };
  }

  function decideSwap(swapId, decision, note) {
    var sw = S().swaps.find(function (s) { return s.id === swapId; });
    if (!sw) return { ok: false, message: "Solicitação não encontrada." };
    if (sw.status !== "pendente") return { ok: false, message: "Esta solicitação já foi analisada." };
    var sc = S().schedules.find(function (s) { return s.id === sw.scheduleId; });
    if (!sc) return { ok: false, message: "Escala não encontrada." };
    var a = sc.assignments.find(function (x) { return x.id === sw.assignmentId; });
    if (!a) return { ok: false, message: "Escala não encontrada." };
    var admin = currentUser();
    sw.decidedAt = new Date().toISOString();
    sw.decidedBy = admin ? admin.id : null;
    sw.adminNote = note || "";
    if (decision === "aprovada") {
      sw.status = "aprovada";
      var before = { voluntário: userName(a.userId), status: a.status };
      if (sw.suggestedUserId) {
        a.userId = sw.suggestedUserId;
        a.status = "pendente";
        a.respondedAt = null;
      } else {
        a.userId = null;
        a.status = "vaga_aberta";
        a.respondedAt = null;
      }
      sc.updatedAt = sw.decidedAt;
      audit("Troca aprovada", userName(sw.requesterId) + " · " + eventById(sw.eventId).name, before, {
        substituto: sw.suggestedUserId ? userName(sw.suggestedUserId) : "vaga aberta"
      }, sw.unit);
      notify({
        title: "Troca aprovada", audience: "user", userId: sw.requesterId, unit: sw.unit, type: "troca",
        text: "Sua solicitação de troca em " + eventById(sw.eventId).name + " foi aprovada."
      });
      if (sw.suggestedUserId) {
        notify({
          title: "Nova escala recebida", audience: "user", userId: sw.suggestedUserId, unit: sw.unit, type: "escala",
          text: "Você foi incluído na escala de " + eventById(sw.eventId).name + " (" + fmtDate(eventById(sw.eventId).date) + ") após uma troca aprovada. Confirme sua presença."
        });
      }
      refreshRests(monthOf(eventById(sw.eventId).date));
    } else {
      sw.status = "rejeitada";
      audit("Troca rejeitada", userName(sw.requesterId) + " · " + eventById(sw.eventId).name, { status: "pendente" }, { status: "rejeitada" }, sw.unit);
      notify({
        title: "Troca não aprovada", audience: "user", userId: sw.requesterId, unit: sw.unit, type: "troca",
        text: "Sua solicitação de troca em " + eventById(sw.eventId).name + " não foi aprovada." + (note ? " Observação: " + note : "")
      });
    }
    notify({
      title: "Resultado de troca", audience: "admin", unit: sw.unit, type: "troca",
      text: "Solicitação de " + userName(sw.requesterId) + " foi " + sw.status + " por " + (admin ? admin.name : "administrador") + "."
    });
    persist();
    return { ok: true, swap: sw };
  }

  /* ------------------------------ whatsapp ------------------------------ */
  function normalizePhone(phone) {
    var d = digits(phone);
    if (!d) return "";
    if (d.length <= 11) d = "55" + d;
    return d;
  }
  function waLink(phone, text) {
    var p = normalizePhone(phone);
    return "https://wa.me/" + p + "?text=" + encodeURIComponent(text);
  }
  function templateBody(templateId, data) {
    var d = data || {};
    var when = d.event ? (d.event.name + " — " + fmtDateLong(d.event.date) + " às " + d.event.time) : "";
    var map = {
      convocacao: "Olá, {nome}! Paz do Senhor 🙏\n\nVocê foi escalado(a) para *{evento}* em {data} às {hora}.\nEquipe: {equipe}\nFunção: {funcao}\n\nConfirme ou recuse sua presença aqui:\n{link}\n\nJuntos por um servir ainda mais forte!",
      confirmacao: "Olá, {nome}! Sua presença foi confirmada para " + when + " na " + (d.unit || "") + ".\nFunção: {funcao}.\n\nObrigado por servir com compromisso. Deus te abençoe!",
      lembrete: "Olá, {nome}! Lembrete: amanhã você serve no " + when + " na " + (d.unit || "") + ".\nFunção: {funcao}.\n\nChegue com 30 minutos de antecedência. Conte com você!",
      troca_solicitada: "Olá, {nome}! Foi registrada uma solicitação de troca para " + when + ".\nMotivo: {motivo}.\n\nA troca depende da aprovação do administrador.",
      troca_aprovada: "Olá, {nome}! A troca para " + when + " foi APROVADA pelo administrador.\nNova função: {funcao}.\n\nVerifique sua escala no sistema.",
      troca_rejeitada: "Olá, {nome}! A solicitação de troca para " + when + " foi analisada e NÃO aprovada.\nSua escala permanece a mesma.\n\nEm caso de dúvida, fale com o dirigente.",
      comunicado: "Olá, {nome}! Comunicado da " + (d.unit || "AMI") + ":\n\n{motivo}\n\nAgentes do Amor AMI — juntos por um servir ainda mais forte!"
    };
    var body = map[templateId] || map.comunicado;
    return body
      .replace(/\{nome\}/g, d.name || "voluntário(a)")
      .replace(/\{evento\}/g, d.event ? d.event.name : "o culto")
      .replace(/\{data\}/g, d.event ? fmtDateLong(d.event.date) : "—")
      .replace(/\{hora\}/g, d.event ? d.event.time : "—")
      .replace(/\{equipe\}/g, d.team || "—")
      .replace(/\{funcao\}/g, d.role || "—")
      .replace(/\{link\}/g, d.link || "entre no sistema Agentes do Amor AMI para confirmar")
      .replace(/\{motivo\}/g, d.motivo || "—");
  }
  function registerMessages(template, recipients, unit) {
    S().messages.unshift({
      id: uid("ms"), at: new Date().toISOString(), by: currentUser() ? currentUser().id : null,
      template: template, count: recipients.length, recipients: recipients.map(function (r) { return r.name; }), unit: unit || null
    });
    audit("Mensagens preparadas no WhatsApp", template, null, { destinatários: recipients.length }, unit);
    persist();
  }

  /* ------------------------------ exposto ------------------------------ */
  N.STORAGE_KEY = STORAGE_KEY;
  N.TERM_VERSION = TERM_VERSION;
  N.termVersion = termVersion;
  N.MANUAL_VERSION = MANUAL_VERSION;
  N.MANUAL_DATE = MANUAL_DATE;
  N.LGPD_LAW = LGPD_LAW;
  N.MONTHS = MONTHS;
  N.MONTHS_SHORT = MONTHS_SHORT;
  N.DOW = DOW;
  N.DOW_SHORT = DOW_SHORT;
  N.PERMISSIONS = PERMISSIONS;

  N.util = {
    pad: pad, isoOf: isoOf, parseISO: parseISO, todayISO: todayISO, addDays: addDays, addMonths: addMonths,
    monthOf: monthOf, monthLabel: monthLabel, fmtDate: fmtDate, fmtDateShort: fmtDateShort, fmtDateLong: fmtDateLong,
    fmtDateTime: fmtDateTime, relative: relative, daysUntil: daysUntil, initials: initials, uid: uid,
    digits: digits, monthDays: monthDays, calendarMatrix: calendarMatrix, nextDow: nextDow, sameDayEvent: sameDayEvent
  };

  N.state = S;
  N.persist = persist;
  N.load = load;
  N.seed = seed;

  N.userById = userById;
  N.teamById = teamById;
  N.eventById = eventById;
  N.scheduleByEvent = scheduleByEvent;
  N.roleOf = roleOf;
  N.roleName = roleName;
  N.unitName = unitName;
  N.userName = userName;
  N.dayName = dayName;

  N.getSession = getSession;
  N.setSession = setSession;
  N.touchSession = touchSession;
  N.clearSession = clearSession;
  N.currentUser = currentUser;
  N.scopeUnits = scopeUnits;
  N.canSeeUnit = canSeeUnit;
  N.isAdmin = isAdmin;
  N.isDirigente = isDirigente;
  N.hasPermission = hasPermission;
  N.canManageUsers = canManageUsers;
  N.login = login;
  N.requestAccessRelease = requestAccessRelease;
  N.releaseAccess = releaseAccess;
  N.recordConsent = recordConsent;
  N.completeFirstAccess = completeFirstAccess;

  N.serviceCount = serviceCount;
  N.assignmentsOf = assignmentsOf;
  N.restRecord = restRecord;
  N.isOnRest = isOnRest;
  N.conflicts = conflicts;
  N.availabilityFor = availabilityFor;
  N.isAvailable = isAvailable;
  N.refreshRests = refreshRests;
  N.releaseRest = releaseRest;
  N.saveAvailability = saveAvailability;

  N.saveSchedule = saveSchedule;
  N.respondAssignment = respondAssignment;
  N.swapRequestsInMonth = swapRequestsInMonth;
  N.requestSwap = requestSwap;
  N.decideSwap = decideSwap;

  N.notify = notify;
  N.audit = audit;
  N.waLink = waLink;
  N.normalizePhone = normalizePhone;
  N.templateBody = templateBody;
  N.registerMessages = registerMessages;


  load();
})(window.AMI);
