import { distance, type Point } from './geometry.ts';

export class HandIds {
  private previous: { id: string; center: Point; at: number }[] = [];
  private next = 1;

  assign(centers: Point[], now: number): string[] {
    const available = this.previous.filter(item => now - item.at <= 700);
    const used = new Set<string>();
    const ids = centers.map(center => {
      let best: typeof available[number] | undefined;
      let gap = .23;
      for (const item of available) {
        const d = distance(center, item.center);
        if (!used.has(item.id) && d < gap) { best = item; gap = d; }
      }
      const id = best?.id ?? `hand-${this.next++}`;
      used.add(id);
      return id;
    });
    this.previous = [...centers.map((center, index) => ({ id: ids[index], center, at: now })),
      ...available.filter(item => !used.has(item.id))];
    return ids;
  }

  reset() { this.previous = []; }
}
