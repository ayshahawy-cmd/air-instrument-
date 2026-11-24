import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { distance, type Point } from './geometry';
import { HandIds } from './hand-ids';

export type Hand = { id: string; points: Point[]; tip: Point; pinch: Point; pinchRatio: number; openRatio: number; palmSpan: number; pinching: boolean; touching: boolean; pose: 'open' | 'closed' | 'unknown' };

export class Vision {
  private tracker?: HandLandmarker;
  private lastVideoTime = -1;
  private lastDetect = 0;
  private ids = new HandIds();
  stream?: MediaStream;
  video = document.createElement('video');

  async start() {
    this.stop();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera needs HTTPS or localhost.');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    this.video.srcObject = this.stream;
    this.video.playsInline = true;
    this.video.muted = true;
    await this.video.play();
    try {
      const version = '0.10.35';
      const wasm = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm`);
      const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      try {
        this.tracker = await HandLandmarker.createFromOptions(wasm, {
          baseOptions: { modelAssetPath, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2,
          minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        });
      } catch {
        this.tracker = await HandLandmarker.createFromOptions(wasm, {
          baseOptions: { modelAssetPath, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 2,
        });
      }
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  detect(now: number): Hand[] | null {
    if (!this.tracker || this.video.readyState < 2) return null;
    if (this.video.currentTime === this.lastVideoTime || now - this.lastDetect < 28) return null;
    this.lastVideoTime = this.video.currentTime;
    this.lastDetect = now;
    const result = this.tracker.detectForVideo(this.video, now);
    const centers = result.landmarks.map(landmarks => ({
      x: 1 - (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
      y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
    }));
    const ids = this.ids.assign(centers, now);
    return result.landmarks.map((landmarks, i) => {
      const points = landmarks.map((p: NormalizedLandmark) => ({ x: 1 - p.x, y: p.y }));
      const span = Math.max(0.025, distance(points[0], points[9]), distance(points[5], points[17]) * 1.1);
      const tipGap = distance(points[4], points[8]);
      const jointGap = Math.min(distance(points[4], points[7]), distance(points[3], points[8]));
      const pinchRatio = Math.min(tipGap, jointGap * 1.08) / span;
      return {
        id: ids[i],
        points,
        tip: points[8],
        pinch: { x: (points[4].x + points[8].x) / 2, y: (points[4].y + points[8].y) / 2 },
        pinchRatio,
        openRatio: tipGap / span,
        palmSpan: span,
        pinching: false,
        touching: false,
        pose: 'unknown',
      };
    });
  }

  stop() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.video.srcObject = null;
    this.tracker?.close();
    this.tracker = undefined;
    this.lastVideoTime = -1;
    this.ids.reset();
  }
}
