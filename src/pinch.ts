import { distance, type Point } from './geometry.ts';

export type PinchChange = {
  started?: Point;
  moved?: Point;
  released?: Point;
  canceled?: boolean;
};

// A hand must first be visibly open, then briefly hold a pinch. Tracking loss
// and large landmark jumps cancel an endpoint move.
export class PinchIntent {
  private openSince: number | null = null;
  private closeSince: number | null = null;
  private releaseSince: number | null = null;
  private lastSeen: number | null = null;
  private lastPoint: Point | null = null;
  private ready = false;
  active = false;

  update(ratio: number, point: Point, now: number): PinchChange {
    let canceled = false;
    if (this.lastSeen !== null && now - this.lastSeen > 300) {
      canceled = this.active;
      this.reset();
    }
    this.lastSeen = now;

    if (this.active) {
      if (ratio >= 0.7) {
        this.releaseSince ??= now;
        if (now - this.releaseSince >= 75) {
          const released = this.lastPoint ?? point;
          this.reset();
          this.openSince = now;
          this.lastSeen = now;
          return { released };
        }
        return {};
      }
      if (this.lastPoint && distance(point, this.lastPoint) > 0.24) {
        this.reset();
        return { canceled: true };
      }
      this.releaseSince = null;
      this.lastPoint = { ...point };
      return { moved: point };
    }

    if (ratio >= 0.7) {
      this.openSince ??= now;
      if (now - this.openSince >= 80) this.ready = true;
      this.closeSince = null;
    } else if (ratio <= 0.53 && this.ready) {
      this.closeSince ??= now;
      if (now - this.closeSince >= 80) {
        this.active = true;
        this.ready = false;
        this.closeSince = null;
        this.openSince = null;
        this.lastPoint = { ...point };
        return { started: point };
      }
    } else {
      this.closeSince = null;
    }
    return canceled ? { canceled: true } : {};
  }

  reset() {
    this.openSince = null;
    this.closeSince = null;
    this.releaseSince = null;
    this.lastSeen = null;
    this.lastPoint = null;
    this.ready = false;
    this.active = false;
  }
}
