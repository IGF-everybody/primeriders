/* Camera coordinates use the original 1200 × 900 image, on every screen size. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HGMapGeometry = api;
})(typeof window === 'undefined' ? globalThis : window, () => {
  const W = 1200, H = 900, MAX = 32;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const base = (w, h) => Math.min(w / W, h / H);
  function constrain(camera, w, h) {
    const zoom = clamp(camera.zoom, 1, MAX), scale = base(w, h) * zoom;
    const axis = (offset, size, viewport) => size <= viewport ? (viewport - size) / 2 : clamp(offset, viewport - size, 0);
    return { zoom, x: axis(camera.x, W * scale, w), y: axis(camera.y, H * scale, h) };
  }
  function overview(w, h) { return constrain({zoom: 1, x: 0, y: 0}, w, h); }
  function focus(x, y, zoom, w, h) {
    const scale = base(w, h) * clamp(zoom, 1, MAX);
    return constrain({zoom, x: w / 2 - x * scale, y: h / 2 - y * scale}, w, h);
  }
  function at(camera, x, y, zoom, w, h) {
    const oldScale = base(w, h) * camera.zoom, nextScale = base(w, h) * clamp(zoom, 1, MAX);
    return constrain({zoom, x: x - (x - camera.x) / oldScale * nextScale, y: y - (y - camera.y) / oldScale * nextScale}, w, h);
  }
  function mission(regions, w, h) {
    const points = regions.filter(r => validMarker(r.marker)).map(r => ({x: r.marker.x * 12, y: r.marker.y * 9}));
    if (!points.length) return overview(w, h);
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const lowX = Math.min(...xs), highX = Math.max(...xs), lowY = Math.min(...ys), highY = Math.max(...ys);
    const fit = Math.min((w - 120) / Math.max(highX - lowX, 12), (h - 120) / Math.max(highY - lowY, 12)) / base(w, h);
    return focus((lowX + highX) / 2, (lowY + highY) / 2, clamp(fit, 1, 24), w, h);
  }
  function validMarker(m) { return !!m && Number.isFinite(m.x) && Number.isFinite(m.y) && m.x >= 0 && m.x <= 100 && m.y >= 0 && m.y <= 100; }
  function routePath(route, regions) {
    const from = regions.find(r => r.id === route.from), to = regions.find(r => r.id === route.to);
    if (!validMarker(from?.marker) || !validMarker(to?.marker) || from.id === to.id) return null;
    const a = from.marker, b = to.marker;
    const controls = route.via;
    if (Array.isArray(controls) && controls.length === 2 && controls.every(p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(v) && v >= 0 && v <= 100))) {
      return `M ${a.x * 12} ${a.y * 9} C ${controls[0][0] * 12} ${controls[0][1] * 9}, ${controls[1][0] * 12} ${controls[1][1] * 9}, ${b.x * 12} ${b.y * 9}`;
    }
    return `M ${a.x * 12} ${a.y * 9} L ${b.x * 12} ${b.y * 9}`;
  }
  return {W, H, MAX, base, constrain, overview, focus, at, mission, validMarker, routePath};
});
