import type { Point } from './geometry.ts';

export type TapChange = { firstTap?: boolean; doubleTap?: Point };

// A quick thumb-to-index contact followed by separation counts as one tap.
// One observed contact frame is enough; the second tap and a minimum interval
// provide the protection against a single noisy landmark frame.
export class DoubleTapIntent {
  private openSince: number | null = null;
  private closedSince: number | null = null;
  private firstTapAt: number | null = null;
  private lastSeen: number | null = null;
  private tapPoint: Point | null = null;
  private armed = false;
  private closed = false;

  get waitingForSecondTap() { return this.firstTapAt !== null; }

  update(ratio: number, point: Point, now: number): TapChange {
    if (this.lastSeen !== null && now - this.lastSeen > 450) this.reset();
    this.lastSeen = now;
    if (this.firstTapAt !== null && now - this.firstTapAt > 700) this.firstTapAt = null;

    if (ratio >= 0.7) {
      if (this.closed) {
        const heldMs = now - (this.closedSince ?? now);
        this.closed = false;
        this.closedSince = null;
        this.openSince = now;
        const closedPoint = this.tapPoint ?? point;
        this.tapPoint = null;
        if (heldMs < 20 || heldMs > 300) {
          this.firstTapAt = null;
          this.armed = false;
          return {};
        }
        if (this.firstTapAt !== null) {
          if (now - this.firstTapAt < 85) return {};
          this.firstTapAt = null;
          this.armed = false;
          return { doubleTap: closedPoint };
        }
        this.firstTapAt = now;
        this.armed = true;
        return { firstTap: true };
      }
      this.openSince ??= now;
      if (now - this.openSince >= 65) this.armed = true;
      this.closedSince = null;
    } else if (ratio <= 0.53) {
      this.openSince = null;
      if (!this.armed) return {};
      if (!this.closed) {
        this.closedSince = now;
        this.closed = true;
        this.tapPoint = { ...point };
      }
    } else if (!this.closed) {
      this.openSince = null;
      this.closedSince = null;
    }
    return {};
  }

  reset() {
    this.openSince = null;
    this.closedSince = null;
    this.firstTapAt = null;
    this.lastSeen = null;
    this.tapPoint = null;
    this.armed = false;
    this.closed = false;
  }
}
