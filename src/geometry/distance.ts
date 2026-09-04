// Minimal 2D geometry helpers -- no external library needed for what this
// rule set actually requires (point/segment/polyline/polygon distance and
// intersection). Used by SSW 1.2.4(a), the one rule in this project that's
// genuinely spatial rather than a label/value lookup.
//
// See docs/rules/ssw-1.2.4-a-no-structure-over-sewer.md for how this is
// used and why a first version of the "does the sewer cross the building"
// check had a real bug (caught by this project's own tests, not by
// inspection): checking only whether the sewer's line ENDPOINTS fall
// inside the building missed the case where the line passes cleanly
// through the polygon's interior without either endpoint landing inside it.

export interface Point {
  x: number;
  y: number;
}

export function distPointToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLenSq = abx * abx + aby * aby;
  const t = abLenSq === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}

export function distPointToPolyline(p: Point, polyline: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    min = Math.min(min, distPointToSegment(p, polyline[i], polyline[i + 1]));
  }
  return min;
}

/** Minimum distance between a polygon's vertices and a polyline. */
export function distPolygonToPolyline(polygon: Point[], polyline: Point[]): number {
  let min = Infinity;
  for (const p of polygon) {
    min = Math.min(min, distPointToPolyline(p, polyline));
  }
  // Also check polyline vertices against polygon edges, in case the
  // closest approach is a polyline vertex against a long polygon edge.
  const n = polygon.length;
  for (const p of polyline) {
    for (let i = 0; i < n; i++) {
      min = Math.min(min, distPointToSegment(p, polygon[i], polygon[(i + 1) % n]));
    }
  }
  return min;
}

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ccw(a: Point, b: Point, c: Point): number {
  return (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = ccw(c, d, a);
  const d2 = ccw(c, d, b);
  const d3 = ccw(a, b, c);
  const d4 = ccw(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * True if the polyline crosses the polygon at all -- covers both "a
 * vertex is inside" (pointInPolygon) and "the line passes clean through
 * without any vertex landing inside" (segment intersection), which a
 * vertex-only test misses.
 */
export function polylineIntersectsPolygon(polyline: Point[], polygon: Point[]): boolean {
  if (polyline.some((p) => pointInPolygon(p, polygon))) return true;
  const n = polygon.length;
  for (let i = 0; i < polyline.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      if (segmentsIntersect(polyline[i], polyline[i + 1], polygon[j], polygon[(j + 1) % n])) {
        return true;
      }
    }
  }
  return false;
}
