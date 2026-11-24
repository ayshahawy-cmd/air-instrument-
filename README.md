# Airloom ✳

**Make music out of thin air.** [Play the live demo](https://ayshahawy-cmd.github.io/air-instrument-/).

Airloom is an open source browser instrument. It watches your hands through your webcam, lets you draw and stretch glowing strings, and turns fingertip swipes into notes. It also works with a mouse or touch screen. The project was inspired by the air-instrument experiments shared by [Mukund Kapoor](https://x.com/mukudotgpt/status/2124792791264108827) and [DataChaz](https://x.com/DataChaz/status/2124838538244202687); its implementation and graphics are original. See the [reference technology audit](docs/reference-audit.md).

## Try it

1. Open the [live site](https://ayshahawy-cmd.github.io/air-instrument-/) in a modern browser.
2. Click **Start camera** and allow camera access. Use good light and keep your hands in frame. You can choose **Try with mouse** instead.
3. **Draw:** show one open hand, pinch your thumb and index finger, move the pinched hand, then release. You can also pinch with both hands and pull them apart. The preview shows where the string will go. With a mouse or touch screen, drag on empty space.
4. **Tune or shorten:** pinch near a string's glowing end and move it, including inward to make a shorter string. With a mouse, drag an end.
5. **Play:** swipe an unpinched index finger across a string. With a mouse, move the pointer across it. A faster swipe plays louder.
6. Each string shows its actual note. Choose **Clean**, **Rock**, **Bass**, **Sitar**, **Harp**, **Glass**, or **Synth** for a sound. **Mix** cycles sounds for new strings. Select a string in **Your strings** and choose a sound to change that string.
7. Choose **Length** for shorter = higher, or **Tension** for longer = higher. Pick a major or minor pentatonic scale. The optional **1 / 3 / 6** buttons create playable chord presets.
8. Press **Open full screen** to play in a larger canvas. Use the full-screen button again or Escape to return.
9. Press **Save favorite** to keep your current strings, sounds, tuning, and scale in this browser. Load or remove saved favorites below the sound picker.

The canvas starts empty. Press **Undo** to remove the newest string, **Delete** beside a string below the canvas to remove that one, or **Clear** to remove all strings. A very short gesture is ignored so a brief accidental pinch does not leave a stray line.

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

The camera is mirrored so movements feel natural. [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) detects 21 landmarks per hand. We compare the thumb and index fingertip distance to a hand-relative threshold. A hand must first be seen open, then briefly hold a pinch before a gesture starts. One pinched hand can draw a string by moving and releasing, or two pinched hands can pull a string between them; the same gesture near an existing endpoint tunes or shortens it. Tracking loss cancels the draft. Plucking requires the unpinched index fingertip's movement segment to cross a string segment, with a cooldown and a movement threshold to reduce repeated notes from tracking jitter. Strings and gestures use normalized canvas coordinates so they survive resizing.

The sound engine uses the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). Clean, Rock, Bass, Sitar, and Harp use variations on a Karplus–Strong model: a noise burst circulates through a damped delay. Glass and Synth use additive partials with different envelopes. Each string keeps its own voice. String length and tuning mode map to MIDI notes snapped to the selected pentatonic scale. The note label and the sound use the same pitch function. Swipe speed changes volume; crossing position changes stereo placement. All sounds are synthesized locally, without recorded samples. Favorites stay in browser storage.

The app is static. There is no sign-in, backend, analytics, recording, or upload. Camera frames stay in the browser and are passed directly to the local hand tracker. On first use, the browser downloads the MediaPipe WebAssembly runtime from jsDelivr and the hand model from Google's public storage. No camera frames are sent to either service. The camera can be stopped by selecting Mouse mode, closing the tab, or revoking browser permission.

## Research and design decisions

| Question | Finding | Decision |
| --- | --- | --- |
| How can a website track hands? | Google's [Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker) returns landmarks and handedness from video frames, and supports two hands. | Use the browser package with `runningMode: 'VIDEO'`, GPU first and CPU fallback. |
| How do we keep gestures intentional? | Hand landmarks can wobble, and a fingertip can pass near a string without actually crossing it. | Require an open hand followed by a brief stable pinch and minimum movement; cancel on tracking loss; require geometric segment crossing plus a cooldown for plucks. |
| How can notes respond immediately? | [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) needs to begin after a user gesture. | Create and resume `AudioContext` when the player clicks Start or Try with mouse. Cache synthesized buffers per note. |
| Can this be hosted as a static site? | [Camera access needs HTTPS or localhost](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia); [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) can publish Vite's output. | Publish through GitHub Pages over HTTPS. |
| What happens on slower devices? | [`detectForVideo` runs synchronously](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.handlandmarker). | Skip duplicate video frames and cap detection near 30 fps. A worker is a future optimization if real-device profiling shows UI stalls. |

## Current limits and ideas

- Camera quality depends on lighting, framing, and browser/device performance. Mouse mode is always available.
- Camera drawing uses one hand; device-specific lighting and tracking can still affect responsiveness. Calibration and accessibility controls are promising next steps.
- The first camera load needs a network connection for the MediaPipe model and runtime. Self-hosting those assets is possible after reviewing their redistribution terms and download size.
- Favorites save up to eight sets of strings in the current browser; they are not synced between devices. Recording and export would be useful follow-ups.

## Contributing

Issues and pull requests are welcome. Keep the app lightweight, local-first, and easy to play. Please test mouse mode as well as camera mode when changing gestures. The source is licensed under [MIT](LICENSE); MediaPipe and its model remain under their own terms.
