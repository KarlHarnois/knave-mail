const DEFAULT_ZOOM = 1;
const MINIMUM_ZOOM = 0.5;
const MAXIMUM_ZOOM = 3;
const ZOOM_STEP = 0.1;
const PERCENT = 100;

const ZOOM_IN_KEYS = new Set(["=", "+"]);
const ZOOM_OUT_KEYS = new Set(["-", "_"]);
const RESET_KEY = "0";

export class ZoomControl {
  private zoom = DEFAULT_ZOOM;

  constructor(
    private readonly applyZoom: (level: number) => void,
    private readonly announce: (notice: string) => void,
  ) {}

  listen(target: Document): void {
    target.addEventListener("keydown", (event) => this.handle(event), { capture: true });
  }

  get level(): number {
    return this.zoom;
  }

  zoomIn(): void {
    this.apply(this.zoom + ZOOM_STEP);
  }

  zoomOut(): void {
    this.apply(this.zoom - ZOOM_STEP);
  }

  reset(): void {
    this.apply(DEFAULT_ZOOM);
  }

  private handle(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    const change = this.changeFor(event.key);
    if (!change) return;
    event.preventDefault();
    event.stopPropagation();
    change();
  }

  private changeFor(key: string): (() => void) | null {
    if (ZOOM_IN_KEYS.has(key)) return () => this.zoomIn();
    if (ZOOM_OUT_KEYS.has(key)) return () => this.zoomOut();
    return key === RESET_KEY ? () => this.reset() : null;
  }

  private apply(requested: number): void {
    const bounded = Math.min(MAXIMUM_ZOOM, Math.max(MINIMUM_ZOOM, requested));
    this.zoom = Math.round(bounded * PERCENT) / PERCENT;
    this.applyZoom(this.zoom);
    this.announce(`zoom ${Math.round(this.zoom * PERCENT)}%`);
  }
}
