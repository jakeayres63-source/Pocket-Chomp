# Chomp Pocket

A phone-first 8-track sampler and 16-step sequencer, inspired by the Chompi. Record sounds with your phone's mic, trim them, and loop them in stacked patterns.

Open it on your phone, then use "Add to Home Screen" to run it like an app. It works offline after the first load, and your samples and patterns are saved in the browser.

## Features
- 8 pads, each its own track, with a synthesized starter kit
- Record from the mic (up to 15 s), or load an audio file
- Auto-trim, drag-to-trim, normalize, reverse, choke
- Per-pad volume, pitch (±24 semitones) and pan
- 16-step sequencer, 4 patterns (A–D), chain mode, tempo, swing
- Live mode writes what you play into the loop; Keys mode plays a pad chromatically

Single static `index.html`, no build step. Uses the Web Audio API and MediaRecorder.
