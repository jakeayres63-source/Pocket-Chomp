# Chomp Pocket

A phone-first 8-track sampler and 16-step sequencer, inspired by the Chompi. Record sounds with your phone's mic, trim them, and loop them in stacked patterns.

Open it on your phone, then use "Add to Home Screen" to run it like an app. It works offline after the first load, and your samples and patterns are saved in the browser.

## Features
- 8 pads, each its own track
- Sound library: 8 synthesized kits (Chomp Basics, 808 Box, Dusty Tape, Crunch, Tiny Perc, Synth Keys, Bass Lab, FX Box), 64 sounds, all tuned to C
- Hold any pad (or tap Sound library) to audition and load a sound, or load a whole kit at once
- Every recording is kept in My Recordings; make your own banks and save pad sounds into them
- Record from the mic (up to 15 s), or load an audio file
- Auto-trim, drag-to-trim, normalize, reverse, choke
- Per-pad volume, pitch (±24 semitones) and pan
- Per-pad FX: low/high-pass filter with resonance, drive, bitcrush, tempo-synced delay, reverb
- 16-step sequencer, 4 patterns (A–D), chain mode, tempo, swing
- Live mode writes what you play into the loop; Keys mode plays a pad chromatically, with octave up and down

Static files, no build step: `index.html` is the app and `sounds.js` synthesizes the factory kits. Uses the Web Audio API and MediaRecorder.
