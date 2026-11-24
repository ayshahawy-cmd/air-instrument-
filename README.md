# Airloom ✳

**Make music out of thin air.** [Play the live demo](https://ayshahawy-cmd.github.io/air-instrument-/).

Airloom is an open source browser instrument. It watches your hands through your webcam, lets you draw and stretch glowing strings, and turns fingertip swipes into notes. It also works with a mouse or touch screen. The project was inspired by the air-instrument experiments shared by [Mukund Kapoor](https://x.com/mukudotgpt/status/2124792791264108827) and [DataChaz](https://x.com/DataChaz/status/2124838538244202687); its implementation and graphics are original. See the [reference technology audit](docs/reference-audit.md).

## Try it

1. Open the [live site](https://ayshahawy-cmd.github.io/air-instrument-/) in a modern browser.
2. Click **Start camera** and allow camera access. Use good light and keep your hands in frame. You can choose **Try with mouse** instead.
3. **Draw:** show an open hand and tap your thumb to your index finger twice. This marks the first end. Move your hand, then double-tap again to mark the other end. The preview follows your hand. You can also drag on the canvas with a mouse or touch screen, even while the camera is on.
4. **Tune or shorten:** pinch near a string's glowing end and move it, including inward to make a shorter string. With a mouse, drag an end.
5. **Play:** swipe any extended fingertip across a string. Index, middle, ring, pinky, and thumb can each pluck independently, so you can sweep several strings as a chord. With a mouse, move the pointer across a string. A faster swipe plays louder.
6. Each string shows its actual note. Choose **Clean**, **Rock**, **Bass**, **Sitar**, **Harp**, **Glass**, or **Synth** for a sound. **Mix** cycles sounds for new strings. Select a string in **Your strings** and choose a sound to change that string.
7. Choose **Length** for shorter = higher, or **Tension** for longer = higher. Pick a major or minor pentatonic scale. The optional **1 / 3 / 6** buttons create playable chord presets.
8. Press **Open full screen** to play in a larger canvas. Use the full-screen button again or Escape to return.
9. Press **Save favorite** to keep your current strings, sounds, tuning, and scale in this browser. Load or remove saved favorites below the sound picker.

The canvas starts empty. Press **Undo** to remove the newest string, **Delete** beside a string below the canvas to remove that one, or **Clear** to remove all strings. A single tap or a tiny string is ignored so accidental motion does not leave a stray line.

## Run locally

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. `localhost` counts as a secure context for browser camera access. For a production build:

```sh
npm run build
npm run preview
```

## How it works

To inspect camera gestures, open the [gesture readout](https://ayshahawy-cmd.github.io/air-instrument-/?debug=1#play) and start the camera. It shows each hand's detected pose, fingertip gap, nearby contact gap, and the thresholds used for a tap. The readout stays in your browser and does not record or upload camera frames.

The camera is mirrored so movements feel natural. [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) detects 21 landmarks per hand. We compare thumb and index separation to a recent open-hand reference; nearby finger joints help detect contact when tips overlap or become occluded. Finger separation confirms release. We match hands across frames by palm position so a label change does not interrupt a gesture. Drawing uses two deliberate double-taps: one for each endpoint. A single observed contact frame can count as a tap, while a long pinch near an existing endpoint tunes or shortens it. The hand overlay now marks confirmed contact with small dots instead of a large ring driven by a raw distance threshold. Brief tracking gaps are tolerated while drawing; a longer loss cancels the draft. Plucking tracks all five extended fingertips independently and requires a movement segment to cross a string, with a cooldown and a hand-size-relative threshold to reduce jitter. Strings and gestures use normalized canvas coordinates so they survive resizing.

The sound engine uses the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). Clean, Rock, Bass, Sitar, and Harp use variations on a Karplus–Strong model: a noise burst circulates through a damped delay. Glass and Synth use additive partials with different envelopes. Each string keeps its own voice. String length and tuning mode map to MIDI notes snapped to the selected pentatonic scale. The note label and the sound use the same pitch function. Swipe speed changes volume; crossing position changes stereo placement. All sounds are synthesized locally, without recorded samples. Favorites stay in browser storage.

The app is static. There is no sign-in, backend, analytics, recording, or upload. Camera frames stay in the browser and are passed directly to the local hand tracker. On first use, the browser downloads the MediaPipe WebAssembly runtime from jsDelivr and the hand model from Google's public storage. No camera frames are sent to either service. The camera can be stopped by selecting Mouse mode, closing the tab, or revoking browser permission.

## Research and design decisions

| Question | Finding | Decision |
| --- | --- | --- |
| How can a website track hands? | Google's [Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) returns landmarks and handedness from video frames, and supports two hands. | Use the browser package with `runningMode: 'VIDEO'`, GPU first and CPU fallback. |
| How do we keep gestures intentional? | Hand landmarks can wobble, especially when the hand is small in frame. | Require two stable taps for each endpoint; preserve hand identity through brief gaps; require geometric segment crossing plus a hand-size-relative movement threshold and cooldown for plucks. |
| How can notes respond immediately? | [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) needs to begin after a user gesture. | Create and resume `AudioContext` when the player clicks Start or Try with mouse. Cache synthesized buffers per note. |
| Can this be hosted as a static site? | [Camera access needs HTTPS or localhost](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia); [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) can publish Vite's output. | Publish through GitHub Pages over HTTPS. |
| What happens on slower devices? | [`detectForVideo` runs synchronously](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.handlandmarker). | Skip duplicate video frames and cap detection near 30 fps. A worker is a future optimization if real-device profiling shows UI stalls. |

## Current limits and ideas

- Camera quality depends on lighting, framing, and browser/device performance. Mouse mode is always available.
- Camera accuracy still depends on lighting, distance, and webcam resolution. The browser requests HD video, but it cannot recover detail that the camera does not capture. A future calibration control could tune thresholds per device.
- The first camera load needs a network connection for the MediaPipe model and runtime. Self-hosting those assets is possible after reviewing their redistribution terms and download size.
- Favorites save up to eight sets of strings in the current browser; they are not synced between devices. Recording and export would be useful follow-ups.

## Contributing

Issues and pull requests are welcome. Keep the app lightweight, local-first, and easy to play. Please test mouse mode as well as camera mode when changing gestures. The source is licensed under [MIT](LICENSE); MediaPipe and its model remain under their own terms.
