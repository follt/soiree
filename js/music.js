/* =========================================================
   MUSIQUE — lecture d'une vraie piste
   « Wallpaper » de Kevin MacLeod (incompetech.com), CC BY 4.0.
   Transcodée en mono AAC 64 kbps et coupée à 2 min 30 (1,2 Mo).

   Volume : la piste est masterisée fort (rms -8,9 dBFS). À 0.19
   elle ressort autour de -23 dBFS, nettement en fond, sous les
   bips de dialogue. C'est la constante VOLUME ci-dessous.

   L'API est identique à l'ancienne version synthétisée, donc
   engine.js n'a pas bougé.
   ========================================================= */

const music = (() => {
  const SRC    = "assets/musique.m4a";
  const VOLUME = 0.19;      // ← le volume de la musique, entre 0 et 1

  let el = null, muted = false, started = false;

  function build() {
    if (el) return el;
    el = new Audio();
    el.src = SRC;
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;                 // on monte en fondu au démarrage
    el.setAttribute("playsinline", "");   // iOS : ne pas passer en plein écran
    return el;
  }

  /* petit fondu, pour ne jamais démarrer ni couper brutalement */
  let fadeTimer = null;
  function fadeTo(target, ms = 600) {
    if (!el) return;
    clearInterval(fadeTimer);
    const from = el.volume, steps = Math.max(1, Math.round(ms / 40));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      const v = from + (target - from) * (i / steps);
      el.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) clearInterval(fadeTimer);
    }, 40);
  }

  return {
    /* à appeler tôt : lance le téléchargement sans bloquer le démarrage */
    init() { build().load(); },

    /* le nom du monde est ignoré : une seule piste pour toute l'expérience */
    play() {
      build();
      if (!started) {
        started = true;
        const p = el.play();
        if (p && p.catch) p.catch(() => { started = false; });  // geste requis, on réessaiera
      }
      if (!muted) fadeTo(VOLUME, 900);
    },

    /* baisse pendant les téléportations, sans couper */
    duck(on) {
      if (muted || !el) return;
      fadeTo(on ? VOLUME * 0.25 : VOLUME, 220);
    },

    toggle() {
      muted = !muted;
      if (el) {
        fadeTo(muted ? 0 : VOLUME, 250);
        if (!muted && el.paused) el.play().catch(() => {});
      }
      return !muted;
    },

    get muted()   { return muted; },
    get ready()   { return !!el; },
    get context() { return null; },      // plus de WebAudio pour la musique
    get element() { return el; },

    /* niveau réel en sortie, pour vérification */
    level() {
      if (!el) return null;
      return { volume: +el.volume.toFixed(3), enLecture: !el.paused,
               position: +el.currentTime.toFixed(1), duree: +(el.duration || 0).toFixed(1) };
    },
  };
})();
