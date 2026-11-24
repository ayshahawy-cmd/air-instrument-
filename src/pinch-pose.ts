export type PinchPose = 'open' | 'closed' | 'unknown';

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

// The thumb-index gap varies with hand size and camera perspective. Keep a
// recent open-hand reference; use fingertip separation to confirm release and
// nearby finger joints as extra evidence of contact when tips are occluded.
export class PinchPoseTracker {
  private baseline = 0;
  private state: PinchPose = 'unknown';
  private closedTipGap = 0;
  private closedContactGap = 0;

  update(contactGap: number, tipGap: number): PinchPose {
    if (!Number.isFinite(contactGap) || !Number.isFinite(tipGap)) return this.state;
    this.baseline = Math.max(tipGap, this.baseline * 0.985);
    const openAt = clamp(this.baseline * 0.82, 0.36, 0.48);
    const closeAt = clamp(this.baseline * 0.72, 0.2, 0.39);
    const jointContact = contactGap <= closeAt * 0.75 && tipGap < this.baseline * 0.98;

    // Tip landmarks can jump apart while the nearby joints still appear close.
    // Let that visible separation end the tap immediately instead of leaving
    // the hand in a "touching" state until the open-hand baseline decays.
    const visiblyOpened = tipGap >= this.closedTipGap * 1.1 && tipGap >= openAt;
    const jointsSeparated = tipGap >= this.closedTipGap * 1.2 && contactGap >= this.closedContactGap * 1.35;
    if (this.state === 'closed' && (visiblyOpened || jointsSeparated)) {
      this.state = 'open';
    } else if (contactGap <= closeAt && (tipGap < openAt || jointContact)) {
      if (this.state !== 'closed') {
        this.closedTipGap = tipGap;
        this.closedContactGap = contactGap;
      } else {
        this.closedTipGap = Math.min(this.closedTipGap, tipGap);
        this.closedContactGap = Math.min(this.closedContactGap, contactGap);
      }
      this.state = 'closed';
    } else if (tipGap >= openAt) this.state = 'open';
    return this.state;
  }
}
