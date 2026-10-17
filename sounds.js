// Factory sound banks for Chomp Pocket. Every sound is synthesized on the phone,
// so the banks cost no downloads and a stock sound can always be restored.
// Melodic sounds are tuned to C (bass to C2, keys to C4) so Keys mode plays in key.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const C2 = 65.41, C3 = 130.81, C4 = 261.63, E4 = 329.63, G4 = 392.0, B4 = 493.88, C5 = 523.25;

  window.ChompSounds = function (SR) {
    const rnd = () => Math.random() * 2 - 1;
    const exp = Math.exp, sin = Math.sin, tanh = Math.tanh, abs = Math.abs;

    // --- tiny DSP kit; each call makes fresh state ---
    function render(len, fn) {
      const n = Math.floor(len * SR), d = new Float32Array(n);
      for (let i = 0; i < n; i++) d[i] = fn(i / SR, i);
      return d;
    }
    function osc() { let p = 0; return (f) => { p += f / SR; p -= Math.floor(p); return p; }; }
    const sine = (p) => sin(TAU * p), saw = (p) => 2 * p - 1, sqr = (p) => (p < 0.5 ? 1 : -1), tri = (p) => 4 * abs(p - 0.5) - 1;
    function lp() { let y = 0; return (x, a) => (y += a * (x - y)); }
    function hp() { let px = 0, py = 0; return (x, a) => { py = a * (py + x - px); px = x; return py; }; }
    // state-variable filter: mode 0 low, 1 band, 2 high; damp 0.05 (very resonant) .. 1.4 (soft)
    function svf() {
      let lo = 0, bp = 0;
      return (x, fc, damp, mode) => {
        const f = 2 * sin(Math.PI * Math.min(fc, SR / 6.5) / SR);
        const hi = x - lo - damp * bp; bp += f * hi; lo += f * bp;
        return mode === 1 ? bp : mode === 2 ? hi : lo;
      };
    }
    const ad = (t, a, k) => (t < a ? t / a : exp(-(t - a) * k));
    const fadeOut = (t, len, r = 0.03) => Math.min(1, Math.max(0, (len - t) / r));
    function crush(d, bits, hold) {
      const L = Math.pow(2, bits - 1); let v = 0;
      for (let i = 0; i < d.length; i++) { if (i % hold === 0) v = Math.round(d[i] * L) / L; d[i] = v; }
      return d;
    }
    function dusty(d) {
      const l = lp(), l2 = lp();
      for (let i = 0; i < d.length; i++) {
        let x = l2(l(d[i], 0.28), 0.5);
        if (Math.random() < 0.0009) x += rnd() * 0.25;
        d[i] = tanh(x * 1.4 + rnd() * 0.004);
      }
      return d;
    }
    function karplus(f, len, damp = 0.996, bright = 0.5) {
      const N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N);
      const l = lp(); for (let i = 0; i < N; i++) buf[i] = l(rnd(), bright);
      let k = 0;
      return render(len, (t) => {
        const a = buf[k], b = buf[(k + 1) % N];
        buf[k] = (a + b) * 0.5 * damp; k = (k + 1) % N;
        return a * fadeOut(t, len);
      });
    }
    function fmNote(f, ratio, index, idxDecay, ampDecay, len) {
      return render(len, (t) => sin(TAU * f * t + index * exp(-t * idxDecay) * sin(TAU * f * ratio * t)) * exp(-t * ampDecay) * fadeOut(t, len));
    }
    function mix(...arrs) {
      const n = Math.max(...arrs.map((a) => a.length)), out = new Float32Array(n);
      for (const a of arrs) for (let i = 0; i < a.length; i++) out[i] += a[i];
      return out;
    }
    function metal(len, decay, freqs = [205.3, 304.4, 369.6, 522.7, 540, 800]) {
      const os = freqs.map(() => osc()), h1 = hp(), h2 = hp();
      return render(len, (t) => {
        let v = 0; for (let j = 0; j < os.length; j++) v += sqr(os[j](freqs[j] * 1.7));
        return h2(h1(v / 6, 0.55), 0.55) * exp(-t * decay) * fadeOut(t, len, 0.01);
      });
    }
    function formant(f0, len, vowels, attack = 0.05) {
      const o = osc(), filt = vowels.map(() => svf());
      return render(len, (t) => {
        const vib = 1 + 0.006 * sin(TAU * 5.2 * t) * Math.min(1, t * 3);
        const s = saw(o(f0 * vib));
        let v = 0; for (let j = 0; j < vowels.length; j++) v += filt[j](s, vowels[j][0], 0.12, 1) * vowels[j][1];
        return v * Math.min(1, t / attack) * fadeOut(t, len, 0.15);
      });
    }
    function kick(len, base, sweep, sweepK, ampK, drive = 1) {
      const o = osc();
      return render(len, (t) => tanh(sine(o(base + sweep * exp(-t * sweepK))) * exp(-t * ampK) * drive + (t < 0.003 ? rnd() * 0.3 : 0)) * fadeOut(t, len, 0.01));
    }

    // gain: level after normalizing, so kits sit together sensibly
    const S = (name, gen, opts = {}) => ({ name, gen, gain: opts.gain ?? 0.9, choke: !!opts.choke });

    const banks = [
      { id: 'basics', name: 'Chomp Basics', sounds: [
        S('KICK', () => kick(0.5, 45, 110, 28, 7)),
        S('SNARE', () => { const h = hp(), o = osc(); return render(0.3, (t) => h(rnd(), 0.85) * exp(-t * 16) * 0.7 + sine(o(185)) * exp(-t * 30) * 0.5); }),
        S('HAT', () => { const h = hp(); return render(0.09, (t) => h(rnd(), 0.5) * exp(-t * 55)); }, { gain: 0.6 }),
        S('CLAP', () => { const h = hp(), l = lp(); return render(0.35, (t) => { const b = [0, 0.011, 0.022].some((o) => t >= o && t < o + 0.008); const env = b ? 1 : t > 0.022 ? exp(-(t - 0.03) * 14) : 0; return l(h(rnd(), 0.9), 0.5) * env; }); }, { gain: 0.75 }),
        S('TOM', () => { const o = osc(); return render(0.35, (t) => sine(o(150 + 80 * exp(-t * 12))) * exp(-t * 9)); }),
        S('BASS', () => { const o = osc(), l = lp(); return render(0.6, (t) => l(saw(o(C2)), 0.06 + 0.2 * exp(-t * 10)) * Math.min(1, t * 400) * exp(-t * 3)); }, { choke: true }),
        S('CHORD', () => render(1.1, (t) => { let v = 0; for (const x of [C4, E4, G4, B4]) v += sin(TAU * x * t) + 0.3 * sin(2 * TAU * x * t); return v * Math.min(1, t * 200) * exp(-t * 2.6); }), { gain: 0.7, choke: true }),
        S('BELL', () => fmNote(C5 * 1.682, 1.4, 2.2, 5, 4, 1.0), { gain: 0.6 }),
      ] },
      { id: '808', name: '808 Box', sounds: [
        S('808 KICK', () => kick(1.2, 48, 90, 35, 2.2, 1.6)),
        S('808 SNARE', () => { const h = hp(), a = osc(), b = osc(); return render(0.35, (t) => (sine(a(238)) * 0.6 + sine(b(476)) * 0.3) * exp(-t * 20) + h(rnd(), 0.8) * exp(-t * 12) * 0.6); }),
        S('CL HAT', () => metal(0.12, 60), { gain: 0.55 }),
        S('OP HAT', () => metal(0.7, 7), { gain: 0.5, choke: true }),
        S('808 CLAP', () => { const f = svf(); return render(0.4, (t) => { const b = [0, 0.01, 0.02, 0.03].some((o) => t >= o && t < o + 0.006); const env = b ? 1 : t > 0.03 ? 0.7 * exp(-(t - 0.036) * 11) : 0; return f(rnd(), 1150, 0.5, 1) * env; }); }, { gain: 0.75 }),
        S('COWBELL', () => { const a = osc(), b = osc(), f = svf(); return render(0.45, (t) => f(sqr(a(540)) + sqr(b(800)), 800, 0.35, 1) * (0.6 * exp(-t * 40) + 0.4 * exp(-t * 7))); }, { gain: 0.6 }),
        S('RIM', () => { const a = osc(), b = osc(), h = hp(); return render(0.07, (t) => h(tri(a(1700)) * 0.6 + sine(b(480)), 0.7) * exp(-t * 90)); }, { gain: 0.6 }),
        S('808 BASS', () => { const o = osc(); return render(1.6, (t) => tanh(2 * sine(o(C2 * (1 + 0.6 * exp(-t * 30))))) * exp(-t * 1.2) * fadeOut(t, 1.6)); }, { choke: true }),
      ] },
      { id: 'dusty', name: 'Dusty Tape', sounds: [
        S('SOFT KICK', () => dusty(kick(0.45, 50, 60, 20, 6))),
        S('DUST SNARE', () => { const o = osc(), l = lp(); return dusty(render(0.3, (t) => l(rnd(), 0.4) * exp(-t * 10) * 0.8 + sine(o(200)) * exp(-t * 25) * 0.4)); }),
        S('SHAKER', () => { const h = hp(); return render(0.16, (t) => h(rnd(), 0.4) * Math.min(1, t / 0.02) * exp(-t * 25)); }, { gain: 0.5 }),
        S('RIM CLICK', () => { const a = osc(), b = osc(); return dusty(render(0.1, (t) => (sine(a(820)) + 0.4 * tri(b(1640))) * exp(-t * 60))); }, { gain: 0.7 }),
        S('LOFI KEYS', () => dusty(mix(...[C4, E4, G4, B4].map((f) => fmNote(f, 1, 1.4, 3, 1.5, 1.8)))), { gain: 0.75, choke: true }),
        S('MUTE BASS', () => { const l = lp(), k = karplus(C2, 0.8, 0.993, 0.3); return dusty(k.map((x) => l(x, 0.15) * 2)); }, { choke: true }),
        S('TAPE VOX', () => dusty(formant(C3, 0.9, [[730, 1], [1090, 0.5], [2440, 0.25]])), { gain: 0.8, choke: true }),
        S('TAPE STOP', () => { const os = [osc(), osc(), osc()]; return dusty(render(0.9, (t) => { const r = Math.pow(Math.max(0, 1 - t / 0.9), 1.6); return (saw(os[0](C4 * r)) + saw(os[1](E4 * r)) + saw(os[2](G4 * r))) * 0.3 * fadeOut(t, 0.9, 0.1); })); }, { gain: 0.7, choke: true }),
      ] },
      { id: 'crunch', name: 'Crunch', sounds: [
        S('CRUSH KICK', () => crush(kick(0.4, 50, 140, 30, 8, 4), 5, 3)),
        S('CRUSH SNARE', () => { const o = osc(); return crush(render(0.25, (t) => rnd() * exp(-t * 14) * 0.8 + sqr(o(180)) * exp(-t * 30) * 0.4), 4, 4); }),
        S('METAL', () => crush(render(0.6, (t) => sin(TAU * 320 * t + 3 * sin(TAU * 1123 * t)) * exp(-t * 8)), 6, 2), { gain: 0.7 }),
        S('GLITCH', () => { const o = osc(); let f = 400; return crush(render(0.3, (t, i) => { if (i % Math.floor(SR * 0.02) === 0) f = 200 + Math.random() * 2400; return sqr(o(f)) * (Math.random() < 0.85 ? 1 : 0) * fadeOut(t, 0.3); }), 4, 6); }, { gain: 0.5 }),
        S('ZAP', () => { const o = osc(); return crush(render(0.25, (t) => sqr(o(1800 * exp(-t * 30) + 80)) * exp(-t * 10)), 5, 2); }, { gain: 0.6 }),
        S('NOISE HIT', () => crush(render(0.2, (t) => rnd() * exp(-t * 18)), 3, 8), { gain: 0.6 }),
        S('CHIP BASS', () => { const o = osc(), l = lp(); return crush(render(0.7, (t) => l(sqr(o(C2)), 0.3) * exp(-t * 3) * fadeOut(t, 0.7)), 4, 4); }, { choke: true }),
        S('CHIP ARP', () => { const o = osc(), seq = [C4, E4, G4, C5]; return crush(render(0.64, (t) => sqr(o(seq[Math.floor(t / 0.04) % 4])) * 0.5 * fadeOut(t, 0.64, 0.1)), 5, 2); }, { gain: 0.6, choke: true }),
      ] },
      { id: 'perc', name: 'Tiny Perc', sounds: [
        S('WOODBLOCK', () => { const a = osc(), b = osc(); return render(0.15, (t) => (sine(a(1050)) + 0.3 * sine(b(2650))) * exp(-t * 45)); }, { gain: 0.7 }),
        S('SHAKER', () => { const h = hp(); return render(0.18, (t) => h(rnd(), 0.3) * Math.min(1, t / 0.03) * exp(-t * 22)); }, { gain: 0.5 }),
        S('TAMBO', () => { const h = hp(), m = metal(0.35, 9, [2300, 3100, 4700, 5900]); return render(0.35, (t, i) => { const b = [0, 0.015, 0.032].reduce((s, o) => s + (t >= o ? exp(-(t - o) * 30) : 0), 0); return h(rnd(), 0.3) * b * 0.4 + m[i] * 0.6; }); }, { gain: 0.55 }),
        S('CONGA HI', () => { const o = osc(); return render(0.35, (t) => sine(o(330 * (1 + 0.15 * exp(-t * 40)))) * exp(-t * 14)); }),
        S('CONGA LO', () => { const o = osc(); return render(0.45, (t) => sine(o(220 * (1 + 0.15 * exp(-t * 40)))) * exp(-t * 10)); }),
        S('CLAVE', () => { const o = osc(); return render(0.12, (t) => sine(o(2500)) * exp(-t * 40)); }, { gain: 0.6 }),
        S('TRIANGLE', () => render(1.4, (t) => (sin(TAU * 4200 * t) + 0.4 * sin(TAU * 6150 * t) + 0.2 * sin(TAU * 9050 * t)) * exp(-t * 3) * fadeOut(t, 1.4)), { gain: 0.4, choke: true }),
        S('SNAP', () => { const f = svf(); return render(0.12, (t) => f(rnd(), 2100, 0.4, 1) * exp(-t * 55)); }, { gain: 0.75 }),
      ] },
      { id: 'keys', name: 'Synth Keys', sounds: [
        S('PLUCK', () => karplus(C4, 1.2, 0.997, 0.6), { choke: true }),
        S('E-PIANO', () => mix(fmNote(C4, 1, 1.8, 2.5, 1.4, 1.6), fmNote(C4 * 2, 7, 0.6, 18, 4, 1.6).map((x) => x * 0.15)), { choke: true }),
        S('ORGAN', () => render(1.0, (t) => { let v = 0; for (const [h, g] of [[0.5, 0.8], [1, 1], [2, 0.6], [3, 0.4], [4, 0.3]]) v += g * sin(TAU * C4 * h * t); return v * Math.min(1, t / 0.01) * fadeOut(t, 1.0, 0.05); }), { gain: 0.7, choke: true }),
        S('PAD', () => { const os = Array.from({ length: 6 }, () => osc()), fr = [C3 * 0.997, C3 * 1.004, G4 / 2 * 0.998, G4 / 2 * 1.003, C4 * 0.999, C4 * 1.002], l = lp(); return render(2.2, (t) => { let v = 0; for (let j = 0; j < 6; j++) v += saw(os[j](fr[j])); return l(v / 6, 0.08) * Math.min(1, t / 0.35) * fadeOut(t, 2.2, 0.5); }); }, { gain: 0.7, choke: true }),
        S('LEAD', () => { const o = osc(), l = lp(); return render(0.8, (t) => l(sqr(o(C4 * (1 + 0.012 * sin(TAU * 5.5 * t) * Math.min(1, Math.max(0, t - 0.15) * 4)))), 0.25) * Math.min(1, t / 0.008) * fadeOut(t, 0.8, 0.08)); }, { gain: 0.7, choke: true }),
        S('BRASS', () => { const os = [osc(), osc(), osc()], f = svf(); return render(0.55, (t) => f((saw(os[0](C4)) + saw(os[1](E4)) + saw(os[2](G4))) / 3, 400 + 3000 * ad(t, 0.04, 6), 0.7, 0) * fadeOut(t, 0.55, 0.1)); }, { gain: 0.75, choke: true }),
        S('GLASS', () => fmNote(C5, 3.5, 3, 4, 2.2, 1.6), { gain: 0.6 }),
        S('CHOIR', () => mix(formant(C4 * 0.997, 1.6, [[300, 1], [870, 0.4], [2240, 0.15]], 0.25), formant(C4 * 1.004, 1.6, [[300, 1], [870, 0.4], [2240, 0.15]], 0.25)), { gain: 0.75, choke: true }),
      ] },
      { id: 'bass', name: 'Bass Lab', sounds: [
        S('SUB', () => render(0.9, (t) => (sin(TAU * C2 * t) + 0.15 * sin(TAU * C2 * 2 * t)) * Math.min(1, t / 0.005) * fadeOut(t, 0.9, 0.1)), { choke: true }),
        S('ACID', () => { const o = osc(), f = svf(); return render(0.5, (t) => tanh(2 * f(saw(o(C2)), 200 + 2500 * exp(-t * 12), 0.12, 0)) * fadeOut(t, 0.5, 0.05)); }, { choke: true }),
        S('REESE', () => { const a = osc(), b = osc(), s = osc(), l = lp(); return render(1.0, (t) => (l((saw(a(C2 * 0.996)) + saw(b(C2 * 1.004))) * 0.5, 0.12) + 0.5 * sine(s(C2))) * Math.min(1, t / 0.01) * fadeOut(t, 1.0, 0.1)); }, { choke: true }),
        S('WOBBLE', () => { const a = osc(), b = osc(), f = svf(); return render(1.0, (t) => f(saw(a(C2)) * 0.6 + sqr(b(C2 / 2)) * 0.4, 250 + 1600 * (0.5 - 0.5 * Math.cos(TAU * 4 * t)), 0.3, 0) * fadeOut(t, 1.0, 0.05)); }, { choke: true }),
        S('FM BASS', () => fmNote(C2, 1, 2.5, 6, 2.5, 0.7), { choke: true }),
        S('PLUCK BASS', () => { const o = osc(), f = svf(); return render(0.45, (t) => f(saw(o(C2)), 150 + 1800 * exp(-t * 25), 0.5, 0) * exp(-t * 4)); }, { choke: true }),
        S('808 LONG', () => { const o = osc(); return render(2.5, (t) => tanh(2.5 * sine(o(C2 * (1 + 0.8 * exp(-t * 25))))) * exp(-t * 0.8) * fadeOut(t, 2.5, 0.2)); }, { choke: true }),
        S('SQUARE', () => { const o = osc(), l = lp(); return render(0.6, (t) => l(sqr(o(C2)), 0.12) * fadeOut(t, 0.6, 0.05) * Math.min(1, t / 0.004)); }, { choke: true }),
      ] },
      { id: 'fx', name: 'FX Box', sounds: [
        S('RISER', () => { const f = svf(); return render(2.0, (t) => f(rnd(), 300 * Math.pow(20, t / 2), 0.25, 1) * Math.pow(t / 2, 1.5) * fadeOut(t, 2, 0.02)); }, { gain: 0.7, choke: true }),
        S('DOWNER', () => { const o = osc(); return render(1.0, (t) => sine(o(60 + 1140 * exp(-t * 4))) * exp(-t * 2) * fadeOut(t, 1)); }, { gain: 0.7 }),
        S('LASER', () => { const o = osc(); return render(0.3, (t) => sqr(o(3000 * exp(-t * 14) + 200)) * exp(-t * 8) * 0.5); }, { gain: 0.5 }),
        S('BLOOP', () => { const o = osc(); return render(0.25, (t) => sine(o(200 + 600 * (1 - exp(-t * 20)))) * exp(-t * 10)); }),
        S('VINYL', () => { const l = lp(); return render(2.0, (t) => (l(rnd(), 0.2) * 0.15 + (Math.random() < 0.002 ? rnd() : 0)) * fadeOut(t, 2, 0.2) * Math.min(1, t / 0.1)); }, { gain: 0.5, choke: true }),
        S('IMPACT', () => { const o = osc(), l = lp(); return render(2.5, (t) => (sine(o(38 + 40 * exp(-t * 8))) * exp(-t * 1.5) + l(rnd(), 0.05) * exp(-t * 2) * 0.8) * fadeOut(t, 2.5, 0.2)); }, { choke: true }),
        S('CHIRP', () => { const o = osc(); return render(0.36, (t) => { const k = (t % 0.12) / 0.12; return sine(o(2000 + 2000 * k)) * (1 - k) * 0.8; }); }, { gain: 0.5 }),
        S('REV CYMBAL', () => { const m = metal(1.5, 0, [3100, 4300, 5200, 6800, 7900, 9400]), h = hp(); return render(1.5, (t, i) => (m[i] * 0.6 + h(rnd(), 0.3) * 0.4) * Math.pow(t / 1.5, 3) * fadeOut(t, 1.5, 0.01)); }, { gain: 0.6, choke: true }),
      ] },
    ];

    // render one sound, normalized to its kit level
    function make(bankId, idx) {
      const s = banks.find((b) => b.id === bankId).sounds[idx];
      const d = s.gen();
      let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, abs(d[i]));
      if (peak > 1e-6) { const k = s.gain / peak; for (let i = 0; i < d.length; i++) d[i] *= k; }
      return d;
    }
    return { banks, make };
  };
})();
