import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { distance, type Point } from './geometry';

export type Hand = { id: string; points: Point[]; tip: Point; pinch: Point; pinching: boolean };

export class Vision {
  private tracker?: HandLandmarker;
  private lastVideoTime = -1;
  private lastDetect = 0;
  stream?: MediaStream;
  video = document.createElement('video');

  async start() {
    this.stop();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera needs HTTPS or localhost.');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
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
          minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5,
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
    return result.landmarks.map((landmarks, i) => {
      const points = landmarks.map((p: NormalizedLandmark) => ({ x: 1 - p.x, y: p.y }));
      const span = Math.max(0.04, distance(points[0], points[9]));
      const pinching = distance(points[4], points[8]) < span * 0.48;
      return {
        id: result.handedness[i]?.[0]?.categoryName ?? `${i}`,
        points,
        tip: points[8],
        pinch: { x: (points[4].x + points[8].x) / 2, y: (points[4].y + points[8].y) / 2 },
        pinching,
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
  }
}
