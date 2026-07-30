/* =========================================================
   SOIRÉE — moteur
   Rendu de scène, dialogues, choix, transitions, particules.
   Aucun asset audio : les sons sont synthétisés à la volée.
   ========================================================= */

const $  = (s) => document.querySelector(s);
const el = { bgA: $("#bg-a"), bgB: $("#bg-b"), weather: $("#weather"), cast: $("#cast"),
             dialog: $("#dialog"), text: $("#text"), next: $("#next"),
             choices: $("#choices"), dissolve: $("#dissolve"), outro: $("#outro"),
             nameplate: $("#nameplate"), who: $("#who"), portrait: $("#portrait"),
             flash: $("#flash"), ring: $("#ring"), watch: $("#watch") };

const state = { node: null, lieu: null, menu: null, front: "a", busy: false };

/* ---------------------------------------------------------
   SON — synthétisé, aucun fichier
--------------------------------------------------------- */
let actx = null;
const audio = {
  wake() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); },
  blip(freq = 620, dur = 0.035, type = "square", gain = 0.22) {
    if (!actx || actx.state !== "running") return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  },
  select() { this.blip(880, 0.05, "square", 0.26); setTimeout(() => this.blip(1180, 0.07, "square", 0.26), 55); },
  confirm() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.13, "square", 0.24), i * 90)); },
  // la montre : balayage ascendant puis coupure nette
  warp() {
    if (!actx || actx.state !== "running") return;
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(2400, t + 0.42);
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(t + 0.5);
  },
};
// le premier geste de l'utilisateur débloque l'audio (politique navigateur)
["pointerdown", "keydown"].forEach(e =>
  window.addEventListener(e, () => { audio.wake(); actx?.resume(); }, { once: true }));

/* ---------------------------------------------------------
   TRANSITION — dissolution pixel, façon écran de combat
--------------------------------------------------------- */
const GRID_X = 12, GRID_Y = 21;
(function buildGrid() {
  el.dissolve.style.gridTemplateColumns = `repeat(${GRID_X}, 1fr)`;
  el.dissolve.style.gridTemplateRows    = `repeat(${GRID_Y}, 1fr)`;
  for (let i = 0; i < GRID_X * GRID_Y; i++) el.dissolve.appendChild(document.createElement("i"));
})();
const cells = [...el.dissolve.querySelectorAll("i")];
const shuffled = () => cells.map(c => [Math.random(), c]).sort((a, b) => a[0] - b[0]).map(p => p[1]);

function dissolve(dir, ms = 340) {
  return new Promise(res => {
    const order = shuffled(), step = ms / order.length;
    order.forEach((c, i) => setTimeout(() => { c.style.opacity = dir === "in" ? 1 : 0; }, i * step));
    setTimeout(res, ms + 40);
  });
}

/* ---------------------------------------------------------
   PARTICULES
--------------------------------------------------------- */
const WEATHER = {
  fireflies: { n: 18, size: [3, 6], color: "#ffd98a", fall: false, glow: true,  speed: [9, 16] },
  petals:    { n: 22, size: [4, 8], color: "#ffc7d9", fall: true,  glow: false, speed: [7, 13] },
  motes:     { n: 26, size: [2, 4], color: "#e9f3c8", fall: true,  glow: true,  speed: [11, 19] },
  waves:     { n: 14, size: [3, 5], color: "#cfe9ff", fall: false, glow: false, speed: [8, 14] },
  warmdust:  { n: 20, size: [2, 4], color: "#ffd7a0", fall: false, glow: true,  speed: [12, 20] },
};

function setWeather(kind) {
  el.weather.innerHTML = "";
  const cfg = WEATHER[kind]; if (!cfg) return;
  const rnd = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < cfg.n; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const s = Math.round(rnd(cfg.size[0], cfg.size[1]));
    const dur = rnd(cfg.speed[0], cfg.speed[1]);
    Object.assign(p.style, {
      width: s + "px", height: s + "px", background: cfg.color,
      left: rnd(0, 100) + "%", top: rnd(0, 100) + "%",
      opacity: rnd(0.35, 0.9),
      boxShadow: cfg.glow ? `0 0 ${s * 2}px ${cfg.color}` : "none",
      animation: `${cfg.fall ? "fall" : "hover"} ${dur}s steps(${Math.round(dur * 4)}) infinite`,
      animationDelay: `-${rnd(0, dur)}s`,
    });
    el.weather.appendChild(p);
  }
}

// keyframes injectées une seule fois
const kf = document.createElement("style");
kf.textContent = `
@keyframes fall {
  0%   { transform: translate(0, -12vh)    rotate(0deg);   }
  100% { transform: translate(6vw, 108vh)  rotate(220deg); }
}
@keyframes hover {
  0%,100% { transform: translate(0, 0); }
  25%     { transform: translate(3vw, -4vh); }
  50%     { transform: translate(-2vw, -7vh); }
  75%     { transform: translate(-4vw, -2vh); }
}`;
document.head.appendChild(kf);

/* ---------------------------------------------------------
   MACHINE À ÉCRIRE
--------------------------------------------------------- */
let typing = null;
function typeText(str) {
  return new Promise(res => {
    clearTimeout(typing);
    el.text.textContent = "";
    el.next.classList.remove("on");
    let i = 0, done = false;
    const finish = () => { if (done) return; done = true; el.text.textContent = str;
                           el.next.classList.add("on"); state.skip = null; res(); };
    state.skip = finish;
    const tick = () => {
      if (done) return;
      if (i >= str.length) return finish();
      el.text.textContent += str[i];
      if (str[i] !== " " && i % 3 === 0) audio.blip(560 + (i % 5) * 22, 0.022, "square", 0.13);
      i++;
      typing = setTimeout(tick, 26);
    };
    tick();
  });
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));
function waitTap() {
  return new Promise(res => {
    const h = () => { window.removeEventListener("pointerdown", h); res(); };
    window.addEventListener("pointerdown", h);
  });
}

/* ---------------------------------------------------------
   RÉSOLUTION DES JETONS  "@lieu"
--------------------------------------------------------- */
function resolve(v) {
  if (typeof v !== "string" || v[0] !== "@") return v;
  const key = v.slice(1);
  return state[key] ?? "";        // @lieu, @menu, @apres…
}
function bgFor(node) {
  const raw = node.bg;
  if (raw === "@lieu") return LIEUX[state.lieu]?.bg ?? "street";
  return raw;
}
function weatherFor(node) {
  const raw = node.weather;
  if (raw === "@lieu") return LIEUX[state.lieu]?.weather ?? "fireflies";
  return raw;
}

/* ---------------------------------------------------------
   RENDU D'UNE SCÈNE
--------------------------------------------------------- */
let currentBg = null;

/* placement du couple, réglable scène par scène.
   cast: false        → personne à l'écran (la scène parle toute seule)
   cast: {bottom, width} → ancrage au sol propre à ce décor          */
/* sprite de groupe : attablés, main dans la main, baiser…
   Quand il y en a un, il remplace le duo debout.               */
function showDuo(name) {
  const d = $("#duo");
  if (!name) { d.classList.remove("show"); d.removeAttribute("src"); return false; }
  const url = `assets/sprites/${name}.png`;
  d.onerror = () => { d.classList.remove("show"); el.cast.style.display = "flex"; };
  if (d.getAttribute("src") !== url) d.src = url;
  d.classList.add("show");
  el.cast.style.display = "none";
  return true;
}

/* Décors dont les personnages font déjà partie de l'image.
   Le modèle y a dessiné lui-même les ombres au sol et la lumière :
   poser un sprite par-dessus afficherait un deuxième couple.        */
const BAKED = new Set(["street", "resto", "park", "forest", "beach", "fin_marche", "fin_bisou"]);

function placeCast(cfg) {
  if (BAKED.has(currentBg)) {              // le couple est déjà dans le décor
    el.cast.style.display = "none";
    showDuo(null);
    return;
  }
  const wanted = resolve(cfg?.duo ?? null);
  if (showDuo(wanted)) return;
  if (cfg === false) { el.cast.style.display = "none"; return; }
  el.cast.style.display = "flex";
  // sans réglage explicite, on rend la main à la feuille de style
  if (cfg?.bottom) el.cast.style.bottom = cfg.bottom; else el.cast.style.removeProperty("bottom");
  if (cfg?.width)  el.cast.style.width  = cfg.width;  else el.cast.style.removeProperty("width");
}

/* couleur de repli par décor : même si une image manque, la scène garde
   son ambiance au lieu de tomber sur du noir                            */
const FALLBACK = {
  street: "#3a2436", resto: "#2b1d22", park: "#2f3a25",
  forest: "#1e2b22", beach: "#3b2d33",
  fin_marche: "#3a2436", fin_bisou: "#3a2436",
};

const imgCache = new Map();
function loadImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const p = new Promise((res) => {
    const i = new Image();
    i.onload  = () => res(true);
    i.onerror = () => { console.warn("asset manquant:", url); res(false); };
    i.src = url;
  });
  imgCache.set(url, p);
  return p;
}

async function paintBg(name) {
  if (name === currentBg) return;
  currentBg = name;
  const url = `assets/bg/${name}.png`;
  await loadImage(url);                       // on n'échange qu'une fois décodé
  $("#world").dataset.scene = name;           // pilote l'accord chromatique des sprites
  const back = state.front === "a" ? el.bgB : el.bgA;
  const front = state.front === "a" ? el.bgA : el.bgB;
  back.style.backgroundColor = FALLBACK[name] ?? "#0b0810";
  back.style.backgroundImage = `url("${url}")`;
  back.classList.add("drift");
  await wait(20);
  back.style.opacity = 1;
  front.style.opacity = 0;
  state.front = state.front === "a" ? "b" : "a";
}

/* précharge tout avant que la partie commence */
async function preload(onProgress) {
  const urls = [
    ...["street", "resto", "park", "forest", "beach", "fin_marche", "fin_bisou"]
      .map(n => `assets/bg/${n}.png`),
    "assets/sprites/him.png", "assets/sprites/her.png",
    "assets/portraits/evan.png", "assets/portraits/lauryne.png",
  ];
  let done = 0;
  await Promise.all(urls.map(u =>
    loadImage(u).then(() => onProgress(++done / urls.length))));
}

/* une réplique : portrait + plaque de nom + machine à écrire */
async function speak(who, text) {
  const c = CAST[who] ?? CAST.evan;
  el.who.textContent = c.name;
  el.nameplate.classList.add("show");
  el.portrait.onerror = () => el.portrait.classList.remove("show");
  el.portrait.onload  = () => el.portrait.classList.add("show");
  if (el.portrait.getAttribute("src") !== c.portrait) el.portrait.src = c.portrait;
  el.dialog.classList.add("show");
  await typeText(text.replace(/@(lieu|menu|apres|date)\b/g, (_, k) => state[k] ?? ""));
}

/* Evan sort la montre : onde, flash, changement de monde */
/* chaque destination a sa couleur d'arrivée : le flash annonce le monde */
const WARP_TINT = {
  street: ["#ffe9c8", "#ffbf5c"],
  resto:  ["#ffdca8", "#ff9d4d"],
  park:   ["#f2ffd0", "#b6e36a"],
  forest: ["#d8ffe4", "#63d99a"],
  beach:  ["#dff2ff", "#63c3ff"],
};

/* cale la montre sur le poignet d'Evan, quelle que soit la taille d'écran */
function placeWatch() {
  const him = $("#him"), world = $("#world");
  if (!him || el.cast.style.display === "none") return false;
  const h = him.getBoundingClientRect(), w = world.getBoundingClientRect();
  if (!h.width) return false;
  el.watch.style.left   = (h.left - w.left + h.width * 0.06) + "px";
  el.watch.style.bottom = (w.bottom - h.bottom + h.height * 0.30) + "px";
  el.watch.style.marginLeft = "0";
  el.ring.style.left = (h.left - w.left + h.width * 0.06) + "px";
  el.ring.style.top  = (h.top - w.top + h.height * 0.70) + "px";
  return true;
}

async function teleport(swap, dest) {
  const [flash, ring] = WARP_TINT[dest] ?? WARP_TINT.street;
  el.flash.style.background = flash;
  el.ring.style.borderColor = ring;
  music.duck(true);
  const hasWatch = placeWatch();
  if (hasWatch) el.watch.classList.add("show");   // Evan sort la montre
  await wait(420);
  audio.warp();
  el.watch.classList.add("ping");            // il appuie dessus
  el.ring.classList.remove("go"); void el.ring.offsetWidth; el.ring.classList.add("go");
  await wait(320);
  el.flash.classList.remove("off"); el.flash.classList.add("on");
  await wait(240);
  el.watch.classList.remove("show", "ping");
  await dissolve("in", 180);
  await swap();
  await dissolve("out", 180);
  el.flash.classList.remove("on"); el.flash.classList.add("off");
  music.duck(false);
  await wait(280);
}

async function go(id) {
  const node = STORY[id];
  if (!node) { console.error("noeud inconnu:", id); return; }
  state.node = id;

  el.choices.innerHTML = "";
  el.dialog.classList.remove("show");
  el.nameplate.classList.remove("show");

  const nextBg = bgFor(node);
  const swap = async () => {
    await paintBg(nextBg);
    setWeather(weatherFor(node));
    music.play(nextBg);              // le thème suit le monde
    placeCast(node.cast);
    el.cast.classList.remove("cast-in"); void el.cast.offsetWidth; el.cast.classList.add("cast-in");
  };

  if (nextBg !== currentBg) {
    if (node.teleport && currentBg !== null) {
      await teleport(swap, nextBg);
    } else {
      await dissolve("in");
      await swap();
      await dissolve("out");
    }
  } else {
    placeCast(node.cast);
  }

  for (const [who, text] of node.lines) {
    await speak(who, text);
    await waitTap();
  }

  if (node.end) return finish(node);

  // scène de transition : pas de bouton, on enchaîne tout seul
  if (node.next) { el.next.classList.remove("on"); return go(node.next); }

  el.next.classList.remove("on");
  node.choices.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.type = "button";
    b.textContent = c.label;
    b.style.animationDelay = (i * 70) + "ms";
    b.onclick = async () => {
      audio.select();
      el.choices.innerHTML = "";          // le menu disparaît, Lauryne prend la parole
      if (c.set) Object.assign(state, c.set);
      if (c.say) { await speak("lauryne", c.say); await waitTap(); }
      go(c.goto);
    };
    el.choices.appendChild(b);
  });
}

/* ---------------------------------------------------------
   LE CŒUR DE FIN
   Des pixels s'échappent des deux personnages, montent, s'assemblent
   en cœur, battent deux fois, puis éclatent — et le ticket sort
   de cet éclat. Tout est dessiné en carrés alignés sur la grille.
--------------------------------------------------------- */

const HEART = [
  "..###...###..",
  ".#####.#####.",
  "#############",
  "#############",
  "#############",
  ".###########.",
  "..#########..",
  "...#######...",
  "....#####....",
  ".....###.....",
  "......#......",
];

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function heartFinale() {
  return new Promise((done) => {
    const cv = $("#fx"), g = cv.getContext("2d");
    const world = $("#world");
    const W = world.clientWidth, H = world.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;

    /* taille d'un pixel du cœur, arrondie pour rester sur la grille */
    const px = Math.max(4, Math.round(W / 34));
    const cols = HEART[0].length, rows = HEART.length;
    const hx = Math.round((W - cols * px) / 2);
    const hy = Math.round(H * 0.30);

    /* d'où partent les pixels : les deux sprites, sinon le centre bas */
    const wr = world.getBoundingClientRect();
    const sources = [];
    for (const sel of ["#him", "#her"]) {
      const s = $(sel);
      if (s && el.cast.style.display !== "none" && s.getBoundingClientRect().width) {
        const r = s.getBoundingClientRect();
        sources.push({ x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height * 0.4 });
      }
    }
    if (!sources.length) sources.push({ x: W / 2, y: H * 0.62 });

    const parts = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (HEART[r][c] !== "#") continue;
        const src = sources[(r + c) % sources.length];
        const tx = hx + c * px, ty = hy + r * px;
        parts.push({
          tx, ty,
          sx: src.x + (Math.random() - 0.5) * 28,
          sy: src.y + (Math.random() - 0.5) * 28,
          delay: 90 + Math.hypot(tx - src.x, ty - src.y) * 0.9 + Math.random() * 160,
          // teinte : bord plus clair, cœur plus soutenu
          light: r < 3 || c < 2 || c > cols - 3,
          vx: (Math.random() - 0.5) * 2.4,
          vy: -1.2 - Math.random() * 1.8,
        });
      }
    }

    const GATHER = 1050, BEAT = 1250, BURST = 750;
    const TOTAL = GATHER + BEAT + BURST;
    const t0 = performance.now();
    cv.classList.add("on");

    // petite montée sonore pendant l'assemblage
    [0, 130, 260, 390, 520, 660].forEach((d, i) =>
      setTimeout(() => audio.blip(520 + i * 110, 0.09, "square", 0.10), d));

    let ticketShown = false;
    function frame(now) {
      const t = now - t0;
      g.clearRect(0, 0, W, H);

      /* --- phase 1 : les pixels convergent --- */
      if (t < GATHER + BEAT) {
        const beatT = Math.max(0, t - GATHER);
        // deux battements, comme un cœur
        let scale = 1;
        if (beatT > 0) {
          const b = beatT / BEAT;
          scale = 1 + 0.10 * Math.exp(-Math.pow((b - 0.18) * 7, 2))
                    + 0.14 * Math.exp(-Math.pow((b - 0.55) * 7, 2));
        }
        const cx = hx + cols * px / 2, cy = hy + rows * px / 2;

        // halo qui grandit avec le battement
        if (beatT > 0) {
          const glow = (scale - 1) * 7;
          g.globalAlpha = Math.min(0.5, glow);
          g.fillStyle = "#ff8fa0";
          g.beginPath();
          g.arc(cx, cy, cols * px * 0.62 * scale, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }

        for (const p of parts) {
          const k = Math.max(0, Math.min(1, (t - p.delay) / 620));
          if (k <= 0) continue;
          const e = easeOut(k);
          let x = p.sx + (p.tx - p.sx) * e;
          let y = p.sy + (p.ty - p.sy) * e - Math.sin(e * Math.PI) * 26; // petite cloche
          if (beatT > 0) {
            x = cx + (p.tx - cx) * scale;
            y = cy + (p.ty - cy) * scale;
          }
          g.globalAlpha = k < 1 ? 0.55 + k * 0.45 : 1;
          g.fillStyle = p.light ? "#ff9aa8" : "#e8556d";
          g.fillRect(Math.round(x), Math.round(y), px, px);
        }
        g.globalAlpha = 1;
      }

      /* --- phase 2 : le cœur éclate --- */
      else {
        const b = (t - GATHER - BEAT) / BURST;
        const cx = hx + cols * px / 2, cy = hy + rows * px / 2;
        for (const p of parts) {
          const d = b * 150;
          const x = p.tx + p.vx * d + (p.tx - cx) * b * 1.5;
          const y = p.ty + p.vy * d + (p.ty - cy) * b * 1.5 + b * b * 90;
          g.globalAlpha = Math.max(0, 1 - b * 1.25);
          g.fillStyle = p.light ? "#ffd0d7" : "#ff8fa0";
          g.fillRect(Math.round(x), Math.round(y), px, px);
        }
        g.globalAlpha = 1;
        if (!ticketShown && b > 0.25) { ticketShown = true; done(); }
      }

      if (t < TOTAL) requestAnimationFrame(frame);
      else { cv.classList.remove("on"); g.clearRect(0, 0, W, H); if (!ticketShown) done(); }
    }
    requestAnimationFrame(frame);

    // battements audibles, calés sur les deux pulsations
    setTimeout(() => audio.blip(150, 0.16, "triangle", 0.30), GATHER + BEAT * 0.18);
    setTimeout(() => audio.blip(140, 0.20, "triangle", 0.34), GATHER + BEAT * 0.55);
  });
}

/* ---------------------------------------------------------
   ÉCRAN FINAL
--------------------------------------------------------- */
function showTicket(node) {
  $("#ui").style.display = "none";      // le ticket reste seul à l'écran
  $("#stamp").textContent   = OUTRO.stamp;
  $("#o-title").textContent = resolve(node.title) ?? "";
  $("#o-sub").textContent   = resolve(node.sub) ?? "";
  $("#o-note").textContent  = resolve(node.note) ?? "";
  $("#o-date").textContent  = resolve(node.date) ?? "";
  $("#sig").textContent     = OUTRO.signature;
  $("#ics").textContent     = OUTRO.cta;
  $("#replay").textContent  = OUTRO.replay;
  /* sans date réelle, un compte à rebours et un fichier calendrier
     n'ont rien à afficher : on les masque au lieu d'inventer un jour */
  const daté = !!state.dateIso;
  $("#countdown").style.display = daté ? "" : "none";
  $("#ics").style.display       = daté ? "" : "none";

  el.outro.classList.add("show");
  el.choices.innerHTML = "";
  if (daté) startCountdown();
}

async function finish(node) {
  $("#ui").style.display = "none";     // on libère l'écran avant l'animation
  await heartFinale();                 // le ticket sort de l'éclat du cœur
  audio.confirm();
  showTicket(node);
  try {
    localStorage.setItem("soiree", JSON.stringify({
      node: state.node, lieu: state.lieu, menu: state.menu, apres: state.apres,
      date: state.date, dateIso: state.dateIso, dateHeure: state.dateHeure, at: Date.now(),
    }));
  } catch (e) {}
}

/* ---------- compte à rebours jusqu'au rendez-vous ---------- */
function rendezVous() {
  // la date qu'elle a choisie ; repli sur le prochain créneau si absente
  const [h, m] = (state.dateHeure ?? "19:40").split(":").map(Number);
  if (state.dateIso) {
    const [y, mo, da] = state.dateIso.split("-").map(Number);
    return new Date(y, mo - 1, da, h, m, 0, 0);
  }
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}
let cdTimer = null;
function startCountdown() {
  const target = rendezVous();
  const box = $("#countdown");
  const tick = () => {
    const ms = target - Date.now();
    if (ms <= 0) { box.textContent = "C'est ce soir."; clearInterval(cdTimer); return; }
    const j = Math.floor(ms / 8.64e7);
    const h = Math.floor(ms % 8.64e7 / 3.6e6), m = Math.floor(ms % 3.6e6 / 6e4);
    box.textContent = j > 0
      ? `dans ${j} jour${j > 1 ? "s" : ""} et ${h} h`
      : `dans ${h} h ${String(m).padStart(2, "0")}`;
  };
  tick();
  clearInterval(cdTimer);
  cdTimer = setInterval(tick, 30000);
}

/* ---------- fichier calendrier, généré côté client ---------- */
function downloadIcs() {
  const start = rendezVous();
  const end = new Date(start.getTime() + 2.5 * 3.6e6);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const title = `${resolve(STORY.fin.title)} — ${HIM} & ${HER}`;
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//soiree//FR",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}@soiree`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${[resolve(STORY.fin.sub), resolve(STORY.fin.note)].filter(Boolean).join(" — ")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "soiree.ics"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------------------------------------------------
   ENTRÉE
--------------------------------------------------------- */
window.addEventListener("pointerdown", () => { if (state.skip) state.skip(); });

/* le premier geste débloque l'audio (politique navigateur) et lance la musique */
function wakeAudio() {
  audio.wake(); actx?.resume();
  music.play(currentBg ?? "street");
  music.context?.resume();
}

/* bouton son */
// sans ça, toucher le bouton son ferait aussi avancer le dialogue
$("#sound").addEventListener("pointerdown", (e) => e.stopPropagation());
$("#sound").addEventListener("click", (e) => {
  e.stopPropagation();
  const on = music.ready ? music.toggle() : (wakeAudio(), true);
  $("#sound").textContent = on ? "♪" : "✕";
  $("#sound").classList.toggle("off", !on);
});

$("#ics").addEventListener("click", (e) => { e.stopPropagation(); downloadIcs(); });
$("#replay").addEventListener("click", (e) => {
  e.stopPropagation();
  try { localStorage.removeItem("soiree"); } catch (_) {}
  location.reload();
});

/* si elle rouvre le lien, on lui remontre son ticket plutôt que de tout rejouer */
function start() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("soiree") || "null"); } catch (_) {}
  if (saved?.lieu) {
    Object.assign(state, { lieu: saved.lieu, menu: saved.menu, apres: saved.apres,
      date: saved.date, dateIso: saved.dateIso, dateHeure: saved.dateHeure });
    currentBg = null;
    paintBg(LIEUX[saved.lieu]?.bg ?? "street").then(() => {
      setWeather(LIEUX[saved.lieu]?.weather ?? "fireflies");
      music.play(currentBg);
      placeCast(STORY.fin.cast);
      showTicket(STORY.fin);
    });
    return;
  }
  go("start");
}

/* démarrage : on précharge tout, puis on attend un geste.
   Ce geste sert double : il débloque l'audio ET lance la partie.        */
async function boot() {
  const boot = $("#boot"), bar = $("#boot-bar i");
  music.init();                       // le fichier se télécharge en parallèle,
  await preload((p) => { bar.style.width = Math.round(p * 100) + "%"; });
                                      // sans jamais retarder le démarrage
  boot.classList.add("ready");
  const begin = () => {
    boot.removeEventListener("pointerdown", begin);
    boot.classList.add("gone");
    wakeAudio();
    start();
    setTimeout(() => { boot.style.display = "none"; }, 500);
  };
  boot.addEventListener("pointerdown", begin);
}
boot();
