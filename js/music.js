/* =========================================================
   MUSIQUE — nappe douce, synthétisée à la volée
   Pas de chiptune : ondes triangle, accords tenus, quelques notes
   égrenées dans un écho. Un thème par monde, fondu au changement.
   Aucun fichier audio.
   ========================================================= */

const music = (() => {
  let ctx = null, master = null, filter = null, limiter = null;
  let delay = null, delayGain = null, wet = null;
  let timer = null, step = 0, nextTime = 0;
  let theme = null, targetGain = 1.05, muted = false;

  const LOOKAHEAD = 25;
  const HORIZON   = 0.20;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- THÈMES ----------
     Lent, peu de notes. chords = 4 accords tenus, un par mesure.  */
  const THEMES = {
    street: {                                  // ruelle du soir, doux
      bpm: 68, chords: [[57,60,64,67],[53,57,60,64],[48,52,55,59],[55,59,62,66]],
      scale: [72,74,76,79,81], cutoff: 1700, air: .5,
    },
    resto: {                                   // bistro, feutré
      bpm: 60, chords: [[50,53,57,60],[55,59,62,65],[48,52,55,59],[45,48,52,55]],
      scale: [69,72,74,77,79], cutoff: 1300, air: .35,
    },
    park: {                                    // heure dorée, ouvert
      bpm: 74, chords: [[48,52,55,59],[55,59,62,66],[57,60,64,67],[53,57,60,64]],
      scale: [72,76,79,81,84], cutoff: 2100, air: .6,
    },
    forest: {                                  // clairière, suspendu
      bpm: 56, chords: [[52,55,59,62],[48,52,55,59],[50,53,57,60],[47,50,54,57]],
      scale: [71,74,78,81,83], cutoff: 1150, air: .7,
    },
    beach: {                                   // large, nostalgique
      bpm: 64, chords: [[53,57,60,64],[48,52,55,59],[55,59,62,66],[50,53,57,60]],
      scale: [69,72,76,79,84], cutoff: 1900, air: .65,
    },
  };

  /* ---------- VOIX ---------- */

  // accord tenu : attaque lente, longue extinction — c'est le lit sonore
  function pad(notes, at, dur, gain) {
    for (const n of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = midi(n);
      o.detune.value = (Math.floor(n * 7919) % 9) - 4;   // micro-désaccord fixe
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(filter);
      o.start(at); o.stop(at + dur + 0.05);
    }
  }

  // note égrenée : courte, ronde, envoyée dans l'écho
  function pluck(n, at, dur, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(filter);
    g.connect(delay);                 // c'est l'écho qui donne l'espace
    o.start(at); o.stop(at + dur + 0.05);
  }

  /* ---------- SÉQUENCEUR ----------
     8 pas par mesure, 4 mesures = 32 pas. Très peu d'évènements.  */

  function schedule(i, at) {
    const t = theme;
    const bar = Math.floor(i / 8) % 4;
    const s = i % 8;
    const chord = t.chords[bar];
    const beat = 60 / t.bpm;

    // nappe : une seule fois par mesure, tenue sur toute la mesure
    if (s === 0) pad(chord, at, beat * 4 * 0.95, 0.052);

    // basse douce sur le premier temps
    if (s === 0) pluck(chord[0] - 24, at, beat * 1.6, 0.20);

    // deux notes égrenées par mesure, prises dans l'accord
    if (s === 3) pluck(chord[2], at, beat * 1.1, 0.085);
    if (s === 6) pluck(chord[1], at, beat * 0.9, 0.065);

    // mélodie : rare, déterministe — la même boucle à chaque tour
    const r = ((i * 2654435761) % 2147483647) / 2147483647;
    if (r < t.air * 0.22 && s % 2 === 1) {
      pluck(t.scale[Math.floor(r * 997) % t.scale.length], at, beat * 1.4, 0.10);
    }
  }

  function tick() {
    if (!theme) return;
    const spb = 60 / theme.bpm / 2;          // un pas = une croche
    while (nextTime < ctx.currentTime + HORIZON) {
      schedule(step, nextTime);
      step = (step + 1) % 32;
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
      filter.type = "lowpass"; filter.frequency.value = 1600; filter.Q.value = 0.4;

      // écho : c'est lui qui remplace la densité de notes par de l'espace
      delay = ctx.createDelay(1.5);
      delay.delayTime.value = 0.42;
      delayGain = ctx.createGain(); delayGain.gain.value = 0.34;   // réinjection
      wet = ctx.createGain();       wet.gain.value = 0.42;
      delay.connect(delayGain).connect(delay);
      delay.connect(wet).connect(filter);

      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 10;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.30;

      filter.connect(master).connect(limiter).connect(ctx.destination);
    },

    play(name) {
      this.init();
      const t = THEMES[name];
      if (!t || theme === t) return;
      const fresh = !theme;
      theme = t;
      filter.frequency.setTargetAtTime(t.cutoff, ctx.currentTime, 0.6);
      delay.delayTime.setTargetAtTime(60 / t.bpm * 0.75, ctx.currentTime, 0.4);
      if (fresh) {
        step = 0; nextTime = ctx.currentTime + 0.1;
        timer = setInterval(tick, LOOKAHEAD);
      }
      if (!muted) master.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.9);
    },

    duck(on) {
      if (!ctx || muted) return;
      master.gain.setTargetAtTime(on ? targetGain * 0.22 : targetGain, ctx.currentTime, 0.18);
    },

    toggle() {
      muted = !muted;
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : targetGain, ctx.currentTime, 0.25);
      return !muted;
    },

    get muted() { return muted; },
    get ready() { return !!ctx; },
    get context() { return ctx; },

    /* analyseur en sortie — sert à mesurer le niveau réel en test */
    tap() {
      if (!ctx) return null;
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      limiter.connect(an);
      return an;
    },
  };
})();
