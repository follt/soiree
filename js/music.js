/* =========================================================
   MUSIQUE — thèmes composés, façon RPG portable
   Vraies mélodies écrites à la main (pas de notes tirées au sort) :
   une ligne chantable, une basse qui marche, une batterie simple.
   Tout est synthétisé, aucun fichier audio.
   -----------------------------------------------------------
   Pour modifier un thème : les mélodies sont des listes
   [note MIDI, durée en doubles-croches]. null = silence.
   16 doubles-croches par mesure, 4 mesures par boucle = 64.
   60 = do central. +12 = une octave au-dessus.
   ========================================================= */

const music = (() => {
  let ctx = null, master = null, limiter = null;
  let timer = null, step = 0, nextTime = 0;
  let theme = null, targetGain = 0.85, muted = false;

  const LOOKAHEAD = 25;
  const HORIZON   = 0.16;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* déplie [[note,durée],…] en 64 cases : note au départ, -1 = tenue */
  function roll(pairs) {
    const out = [];
    for (const [n, len] of pairs) {
      out.push(n === null ? null : n);
      for (let i = 1; i < len; i++) out.push(n === null ? null : -1);
    }
    while (out.length < 64) out.push(null);
    return out.slice(0, 64);
  }

  const THEMES = {
    /* ---- LA RUELLE : thème de ville, chaleureux, do majeur ---- */
    street: {
      bpm: 124, drums: 0.8,
      chords: [[48,52,55],[45,52,57],[41,48,53],[43,50,55]],
      mel: roll([[76,2],[74,2],[72,4],[null,2],[67,2],[72,4],
                 [74,2],[76,2],[77,4],[76,4],[74,4],
                 [72,2],[71,2],[69,4],[null,2],[67,2],[71,4],
                 [72,4],[74,4],[76,8]]),
    },

    /* ---- LE PARC : plus vif, lumineux, fa majeur ---- */
    park: {
      bpm: 138, drums: 1,
      chords: [[41,48,53],[48,52,55],[45,52,57],[43,50,55]],
      mel: roll([[77,2],[79,2],[81,4],[79,2],[77,2],[76,4],
                 [79,2],[81,2],[83,4],[84,6],[null,2],
                 [81,2],[79,2],[77,4],[76,2],[74,2],[72,4],
                 [74,4],[77,4],[81,8]]),
    },

    /* ---- LA FORÊT : mineur, plus mystérieux mais toujours mélodique ---- */
    forest: {
      bpm: 112, drums: 0.45,
      chords: [[45,52,57],[43,50,55],[41,48,53],[40,47,52]],
      mel: roll([[69,4],[72,2],[74,2],[76,4],[74,4],
                 [72,4],[71,2],[69,2],[67,8],
                 [69,2],[71,2],[72,4],[74,4],[76,4],
                 [77,4],[76,4],[74,8]]),
    },

    /* ---- LA PLAGE : ample, nostalgique, sol majeur ---- */
    beach: {
      bpm: 118, drums: 0.6,
      chords: [[43,50,55],[48,52,55],[45,52,57],[41,48,53]],
      mel: roll([[74,4],[79,4],[78,2],[76,2],[74,4],
                 [72,4],[74,4],[76,8]],
                ).concat(roll([[71,4],[74,4],[76,2],[74,2],[72,4],
                               [69,6],[null,2],[67,8]])).slice(0, 64),
    },

    /* ---- LE BISTRO : lent, feutré, ré mineur ---- */
    resto: {
      bpm: 100, drums: 0.3,
      chords: [[38,45,50],[43,50,55],[36,43,48],[41,48,53]],
      mel: roll([[74,4],[77,4],[81,6],[null,2],
                 [79,4],[77,4],[74,8],
                 [72,4],[74,4],[77,6],[null,2],
                 [76,4],[74,4],[69,8]]),
    },
  };

  /* ---------- VOIX ---------- */

  // onde pulsée fine : le timbre caractéristique des consoles portables
  let pulseWave = null;
  function getPulse() {
    if (pulseWave) return pulseWave;
    const n = 24, real = new Float32Array(n), imag = new Float32Array(n);
    for (let i = 1; i < n; i++) imag[i] = Math.sin(i * Math.PI * 0.25) / (i * 0.9); // ~25 %
    pulseWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    return pulseWave;
  }

  function voice(n, at, dur, gain, kind) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (kind === "pulse") o.setPeriodicWave(getPulse());
    else o.type = kind;
    o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.012);
    g.gain.setValueAtTime(gain, at + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(master);
    o.start(at); o.stop(at + dur + 0.02);
  }

  let noiseBuf = null;
  function drum(at, dur, gain, hp) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = hp;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(master);
    s.start(at); s.stop(at + dur);
  }

  /* ---------- SÉQUENCEUR ---------- */

  function schedule(i, at) {
    const t = theme;
    const bar = Math.floor(i / 16) % 4;
    const s = i % 16;
    const chord = t.chords[bar];
    const sixteenth = 60 / t.bpm / 4;

    /* MÉLODIE — on ne déclenche que sur une attaque, on laisse tenir sinon */
    const m = t.mel[i];
    if (m !== null && m !== -1) {
      let len = 1;
      while (t.mel[(i + len) % 64] === -1 && len < 16) len++;
      voice(m, at, sixteenth * len * 0.92, 0.115, "pulse");
      voice(m - 12, at, sixteenth * len * 0.9, 0.030, "pulse");   // doublure grave
    }

    /* BASSE — croches qui marchent : fondamentale, quinte, fondamentale, octave */
    if (s % 2 === 0) {
      const walk = [chord[0], chord[0], chord[1], chord[0],
                    chord[2], chord[0], chord[1], chord[0]][(s / 2) % 8];
      voice(walk - 12, at, sixteenth * 1.7, 0.20, "triangle");
    }

    /* HARMONIE — accord bref sur les contretemps */
    if (s === 4 || s === 12) {
      for (const n of chord) voice(n + 12, at, sixteenth * 1.4, 0.028, "square");
    }

    /* BATTERIE */
    if (t.drums > 0) {
      if (s % 2 === 0) drum(at, 0.028, 0.045 * t.drums, 7000);      // charleston
      if (s === 4 || s === 12) drum(at, 0.10, 0.16 * t.drums, 1400); // caisse claire
    }
  }

  function tick() {
    if (!theme) return;
    const spb = 60 / theme.bpm / 4;
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
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.25;
      master.connect(limiter).connect(ctx.destination);
    },

    play(name) {
      this.init();
      const t = THEMES[name];
      if (!t || theme === t) return;
      const fresh = !theme;
      theme = t;
      if (fresh) {
        step = 0; nextTime = ctx.currentTime + 0.1;
        timer = setInterval(tick, LOOKAHEAD);
      } else {
        step = 0;                       // on repart au début du thème
      }
      if (!muted) master.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.6);
    },

    duck(on) {
      if (!ctx || muted) return;
      master.gain.setTargetAtTime(on ? targetGain * 0.2 : targetGain, ctx.currentTime, 0.15);
    },

    toggle() {
      muted = !muted;
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : targetGain, ctx.currentTime, 0.2);
      return !muted;
    },

    get muted() { return muted; },
    get ready() { return !!ctx; },
    get context() { return ctx; },

    tap() {
      if (!ctx) return null;
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      limiter.connect(an);
      return an;
    },
  };
})();
