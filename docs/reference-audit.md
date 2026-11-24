# Reference audit: Mukund Kapoor's Air Instrument

Audited on 24 November 2026 from the [live project](https://mukundkapoor.com/projects/air-instrument/), its [full-screen demo](https://mukundkapoor.com/projects/air-instrument/demo/), and the [public MIT-licensed source](https://github.com/Mukundkapoor26/air-instrument). This describes what the published source does; it does not imply that Airloom uses the same implementation.

## Published architecture

The reference demo is a single HTML page containing its CSS, markup, and JavaScript. Its project page embeds that demo in an iframe and links directly to the `/demo/` route for full-screen play. There is no server-side gesture or audio processing in the demo.

| Layer | What the source does | Why it matters |
| --- | --- | --- |
| Camera and hands | MediaPipe Hand Landmarker tracks up to two hands in browser video. The video is mirrored. It uses the thumb and index landmarks for pinching, index fingertips for plucks, handedness to maintain left/right hand state, and a short tracking-loss grace period. | A deliberate transition into a pinch is the gesture gate. A hand simply entering the frame should not draw. Stable hand identity and filtered points prevent random lines. |
| Gesture smoothing | Each hand uses One Euro filters for pinch position and finger tips. The filter increases responsiveness during fast movement while calming idle jitter. | This is a better fit than constant heavy smoothing for both slow positioning and quick plucks. |
| String state | Up to six strings store endpoints in screen fractions, sound choice, and chord interval. A pinch near an end moves that end; a pinch near the middle moves the string; a pinch in empty air draws one. A fast release from the middle throws a string away. | Endpoint editing, whole-string movement, and removal are separate actions. Very short drafts are discarded. |
| Pitch | String length maps to a frequency and MIDI note. The default **tension** mode makes longer strings higher; **length** mode reverses that. Notes can snap to major or minor pentatonic scales. The same MIDI note feeds audio and the displayed label. | Note labels must reflect the *played* pitch after tuning and scale snapping, including preset intervals. |
| Sound | An `AudioWorkletProcessor` runs six synthesis voices. Five sounds use a Karplus–Strong style feedback delay; synth uses an oscillator/envelope. Sound configurations change brightness, damping, buzz, distortion, filter, and reverb send. The output uses body/presence EQ, convolution reverb, compression, and limiting. | Processing the string loop off the main thread supports smooth, continuous bends and multiple simultaneous strings. |
| Visuals | WebGL shaders draw the strings and seven distinct effect styles. Canvas overlays hand landmarks and note labels. The seven sounds are Clean, Rock, Bass, Sitar, Harp, Glass, and Synth. | The glow, waves, and reaction to plucks are part of the instrument feedback. |
| Controls | Sounds, 1/3/6 string presets, tension, scale snap, minor mode, mouse play, keyboard shortcuts, and the separate full-screen demo are exposed directly. | A player can explore without reading a long guide. |

## Airloom implementation and differences

Airloom uses Vite and TypeScript, MediaPipe Hand Landmarker, Canvas 2D, and Web Audio. It now shows note names on the strings and the active note in the stage, offers seven individually synthesized sounds and distinct graphics, major/minor pentatonic snapping, length/tension modes, optional 1/3/6 chord presets, and full-screen play. Pitch labels and sound share `midiForLength` so they cannot disagree about the current note. Presets and favorites also save each string's sound and tuning state.

Airloom deliberately starts and resets with an **empty canvas**, matching the owner's request. Its default remains **length mode** (shorter means higher). The owner later chose a double-tap gesture: two thumb-to-index taps mark the first endpoint, and another two mark the second. This is intentionally different from the reference's pinch-and-pull drawing. All five extended fingertips can pluck independently. The reference starts with a string and defaults to tension mode. Optional chord buttons create presets only when clicked. Airloom also keeps Undo and per-string Delete visible, instead of relying on a throw gesture.

The audio and visual implementations are different. Airloom generates and caches short Web Audio buffers for plucks, then adjusts playback rate while a note rings. The reference runs a continuous feedback string model in an AudioWorklet. Airloom uses Canvas 2D effects; the reference uses WebGL shaders. These differences can be heard or seen during long bends and on slower devices. Replacing the buffer model with an AudioWorklet and profiling camera-to-audio latency are the next steps if closer physical behavior is needed. We did not copy the reference's source or shader code into Airloom.

## Verification targets

1. Starting camera, switching to mouse, and clearing must leave zero strings until the player draws or explicitly selects a preset.
2. An open hand followed by two stable taps should mark the first endpoint; a second double-tap should finish exactly one string. A single tap, a hand appearing already pinched, and a brief tracking gap should not create a stray string.
3. Moving an endpoint should update both the displayed note and the next played pitch. Length and tension modes should change in opposite directions.
4. Each sound should be selectable. Existing strings should keep their sound unless explicitly selected and changed. Favorites should restore sounds, scale, tuning, endpoints, and chord intervals.
5. Full-screen play should expose the stage, controls, and sounds, and allow a clear exit path.

## Sources

- [Mukund Kapoor, Air Instrument project and demo](https://mukundkapoor.com/projects/air-instrument/)
- [Mukund Kapoor, source repository and README](https://github.com/Mukundkapoor26/air-instrument)
- [Google, Hand Landmarker for web](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker/web_js)
- [MDN, AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [MDN, Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
