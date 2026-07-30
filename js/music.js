/* =========================================================
   MUSIQUE — séquenceur chiptune procédural
   Aucun fichier audio : tout est synthétisé à la volée.
   Un thème par monde, fondu enchaîné au changement de décor.
   ========================================================= */

const music = (() => {
  let ctx = null, master = null, filter = null;
  let timer = null, step = 0, nextTime = 0;
  let theme = null, targetGain = 0.16, muted = false;

  const LOOKAHEAD = 25;      // ms entre deux réveils du planificateur
  const HORIZON  = 0.12;     // s d'avance sur l'horloge audio

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- THÈMES ----------
     chords : 4 accords (notes MIDI), un par mesure
     scale  : notes disponibles pour la mélodie
     mood   : réglages de timbre et de densité                */
  const THEMES = {
    street: {                                  // ruelle au crépuscule, doux-amer
      bpm: 96, chords: [[57,60,64],[53,57,60],[48,52,55],[55,59,62]],
      scale: [69,72,74,76,79,81], lead: .55, perc: .5, cutoff: 2600,
    },
    resto: {                                   // bistro, chaleureux, presque jazz
      bpm: 82, chords: [[50,53,57,60],[55,59,62,65],[48,52,55,59],[48,52,55,59]],
      scale: [67,69,72,74,77,79], lead: .40, perc: .28, cutoff: 1900,
    },
    park: {                                    // heure dorée, lumineux
      bpm: 104, chords: [[48,52,55],[55,59,62],[57,60,64],[53,57,60]],
      scale: [72,74,76,79,81,84], lead: .62, perc: .6, cutoff: 3200,
    },
    forest: {                                  // clairière, calme, un peu mystérieux
      bpm: 76, chords: [[52,55,59],[48,52,55],[55,59,62],[50,54,57]],
      scale: [71,74,76,78,81,83], lead: .45, perc: .22, cutoff: 1700,
    },
    beach: {                                   // large, nostalgique
      bpm: 88, chords: [[53,57,60],[48,52,55],[55,59,62],[57,60,64]],
      scale: [69,72,74,77,79,84], lead: .50, perc: .38, cutoff: 2900,
    },
  };

  /* ---------- VOIX ---------- */

  function tone(freq, at, dur, type, gain, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(filter);
    o.start(at); o.stop(at + dur + 0.02);
  }

  // percussion : bruit filtré très court
  let noiseBuf = null;
  function noise(at, dur, gain, hp) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = hp;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(filter);
    s.start(at); s.stop(at + dur);
  }

  /* ---------- SÉQUENCEUR ----------
     16 pas par mesure, 4 mesures par boucle = 64 pas         */

  function schedule(i, at) {
    const t = theme;
    const bar = Math.floor(i / 16) % 4;
    const s16 = i % 16;
    const chord = t.chords[bar];
    const root = chord[0];

    // BASSE — fondamentale sur les temps 1 et 3, quinte sur le 4
    if (s16 === 0)  tone(midi(root - 12), at, 0.42, "triangle", 0.16);
    if (s16 === 8)  tone(midi(root - 12), at, 0.30, "triangle", 0.12);
    if (s16 === 14) tone(midi(chord[2] - 12), at, 0.16, "triangle", 0.09);

    // ARPÈGE — croches continues à travers l'accord
    if (s16 % 2 === 0) {
      const n = chord[(s16 / 2) % chord.length];
      tone(midi(n), at, 0.13, "square", 0.045);
      tone(midi(n), at, 0.13, "square", 0.028, 7);   // léger désaccord = épaisseur
    }

    // MÉLODIE — clairsemée, pseudo-aléatoire mais déterministe (même boucle à chaque fois)
    const seed = (i * 2654435761) % 2147483647;
    const r = (seed / 2147483647);
    if (r < t.lead * 0.34 && s16 % 2 === 0) {
      const n = t.scale[Math.floor(r * 997) % t.scale.length];
      tone(midi(n), at, 0.34, "square", 0.055);
    }

    // PERCUSSION — pulsation discrète
    if (t.perc > 0.25 && s16 % 8 === 0) noise(at, 0.05, 0.05 * t.perc, 1200);
    if (t.perc > 0.45 && s16 % 8 === 4) noise(at, 0.09, 0.035 * t.perc, 4000);
  }

  function tick() {
    if (!theme) return;
    const spb = 60 / theme.bpm / 4;            // durée d'un pas (double-croche)
    while (nextTime < ctx.currentTime + HORIZON) {
      schedule(step, nextTime);
      step = (step + 1) % 64;
      nextTime += spb;
    }
  }

  /* ---------- API PUBLIQUE ---------- */

  return {
    init() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 2400; filter.Q.value = 0.6;
      filter.connect(master).connect(ctx.destination);
    },

    /* démarre ou change de thème, avec fondu */
    play(name) {
      this.init();
      const t = THEMES[name];
      if (!t) return;
      if (theme === t) return;
      const fresh = !theme;
      theme = t;
      filter.frequency.setTargetAtTime(t.cutoff, ctx.currentTime, 0.35);
      if (fresh) {
        step = 0; nextTime = ctx.currentTime + 0.08;
        timer = setInterval(tick, LOOKAHEAD);
      }
      if (!muted) master.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.5);
    },

    /* baisse le volume sans couper le séquenceur (pendant une téléportation) */
    duck(on) {
      if (!ctx || muted) return;
      master.gain.setTargetAtTime(on ? targetGain * 0.25 : targetGain, ctx.currentTime, 0.15);
    },

    toggle() {
      muted = !muted;
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : targetGain, ctx.currentTime, 0.2);
      return !muted;
    },

    get muted() { return muted; },
    get ready() { return !!ctx; },
    get context() { return ctx; },
  };
})();
