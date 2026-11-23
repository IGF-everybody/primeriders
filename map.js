(() => {
  'use strict';
  const viewport = document.getElementById('map-viewport');
  if (!viewport) return;
  const G = window.HGMapGeometry, data = window.HG_CATALOG;
  const regions = data.regions, routes = (data.mapRoutes || []).filter(route => G.routePath(route, regions));
  const byId = id => document.getElementById(id);
  const scene = byId('map-scene'), routeLayer = byId('map-routes');
  const pins = new Map(), rows = new Map(), paths = new Map();
  let camera, width = 1, height = 1, showRoutes = true, cameraMode = 'overview';
  let animation = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const plotted = regions.filter(entry => G.validMarker(entry.marker));
  const cluster = plotted.length > 1 ? make('button', 'atlas-pin atlas-cluster') : null;
  if (cluster) {
    cluster.type = 'button';
    cluster.style.left = plotted.reduce((sum, entry) => sum + entry.marker.x, 0) / plotted.length + '%';
    cluster.style.top = plotted.reduce((sum, entry) => sum + entry.marker.y, 0) / plotted.length + '%';
    cluster.setAttribute('aria-label', 'Enter mission area: ' + plotted.length + ' regions');
    cluster.append(make('span', 'cluster-count', String(plotted.length)), make('span', 'pin-label', 'Mission area'));
    cluster.addEventListener('click', () => {
      // Keep keyboard focus usable when the cluster disappears during the flight.
      viewport.focus({preventScroll:true});
      navigate('mission');
    });
    byId('map-markers').append(cluster);
  }
  const grid = byId('map-local-grid');
  for (let x = 0; x <= G.W; x += 12) grid.append(svg('path', {d:`M ${x} 0 V ${G.H}`}));
  for (let y = 0; y <= G.H; y += 12) grid.append(svg('path', {d:`M 0 ${y} H ${G.W}`}));
  function paint() {
    const scale = G.base(width, height) * camera.zoom;
    scene.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${scale})`;
    scene.style.setProperty('--pin-scale', String(1 / scale));
    viewport.classList.toggle('is-overview', camera.zoom < 1.45);
    const plotted = regions.filter(entry => G.validMarker(entry.marker));
    const span = plotted.length ? Math.max((Math.max(...plotted.map(e => e.marker.x))-Math.min(...plotted.map(e => e.marker.x)))*12*scale,(Math.max(...plotted.map(e => e.marker.y))-Math.min(...plotted.map(e => e.marker.y)))*9*scale) : 0;
    const compact = plotted.length > 1 && span < 150;
    pins.forEach(pin => { pin.hidden = compact; });
    if (cluster) cluster.hidden = !compact;
    routeLayer.style.display = showRoutes && !compact ? '' : 'none';
    viewport.classList.toggle('is-local-chart', camera.zoom >= 6);
    byId('map-scale-label').textContent = camera.zoom >= 6 ? 'LOCAL NAVIGATION' : 'GALACTIC OVERVIEW';
    const left = Math.max(0, -camera.x / scale), top = Math.max(0, -camera.y / scale);
    const right = Math.min(G.W, (width - camera.x) / scale), bottom = Math.min(G.H, (height - camera.y) / scale);
    const frame = byId('map-mini-view');
    for (const [key, value] of Object.entries({x:left, y:top, width:Math.max(0,right-left), height:Math.max(0,bottom-top)})) frame.setAttribute(key, String(value));
  }
  function destination() {
    return cameraMode === 'mission' ? G.mission(regions, width, height) : G.overview(width, height);
  }
  function navigate(mode, {animate = true} = {}) {
    cancelAnimationFrame(animation);
    animation = null;
    cameraMode = mode;
    const next = destination(), start = {...camera};
    byId('map-back').disabled = mode === 'overview';
    byId('map-next').disabled = mode === 'mission' || !plotted.length;
    byId('map-step').textContent = mode === 'mission' ? '2 / 2 · Mission area' : '1 / 2 · Full galaxy';
    if (!animate || reducedMotion.matches) {
      camera = next;
      paint();
      return;
    }
    const started = performance.now();
    // Interpolate world center and logarithmic scale for a steady flight.
    const base = G.base(width, height);
    const from = {x:(width / 2 - start.x) / (base * start.zoom), y:(height / 2 - start.y) / (base * start.zoom)};
    const to = {x:(width / 2 - next.x) / (base * next.zoom), y:(height / 2 - next.y) / (base * next.zoom)};
    function frame(now) {
      const progress = Math.min(1, (now - started) / 1100);
      const eased = progress * progress * (3 - 2 * progress);
      const zoom = start.zoom * Math.pow(next.zoom / start.zoom, eased);
      camera = progress === 1 ? next : G.focus(from.x + (to.x - from.x) * eased, from.y + (to.y - from.y) * eased, zoom, width, height);
      paint();
      animation = progress < 1 ? requestAnimationFrame(frame) : null;
    }
    animation = requestAnimationFrame(frame);
  }
  function announce(message) { byId('map-announcement').textContent = message; }
  function select(id, {center = false, updateHash = true, quiet = false} = {}) {
    const entry = regions.find(region => region.id === id);
    if (!entry) return;
    pins.forEach((pin, key) => pin.setAttribute('aria-pressed', String(key === id)));
    rows.forEach((row, key) => row.setAttribute('aria-pressed', String(key === id)));
    routes.forEach(route => paths.get(route.id)?.classList.toggle('is-connected', route.from === id || route.to === id));
    byId('map-detail-code').textContent = entry.code || 'REGION RECORD';
    byId('map-detail-status').textContent = entry.marker?.unknown ? 'Unresolved signal' : 'Registered region';
    byId('map-detail-name').textContent = entry.name;
    byId('map-detail-description').textContent = entry.description;
    const links = byId('map-detail-links');links.replaceChildren();
    const records = [...(entry.related || [])];
    if (entry.href) records.unshift({href:entry.href, label:entry.href.startsWith('ciclo-') ? 'Read linked log' : 'Open region record'});
    records.forEach(record => { const a = make('a', '', record.label);a.href = record.href;links.append(a); });
    const connections = byId('map-connection-links');connections.replaceChildren();
    const neighbours = [...new Set(routes.filter(route => route.from === id || route.to === id).map(route => route.from === id ? route.to : route.from))];
    neighbours.forEach(otherId => {
      const other = regions.find(region => region.id === otherId), button = make('button', '', other.name);
      button.type = 'button';button.addEventListener('click', () => select(otherId, {center:true}));connections.append(button);
    });
    byId('map-connections').hidden = neighbours.length === 0;
    if (center && G.validMarker(entry.marker) && cameraMode !== 'mission') navigate('mission');
    if (updateHash) {
      try { history.replaceState(null, '', '#region=' + encodeURIComponent(id)); } catch (_) { /* Selection remains usable on restricted local-file origins. */ }
    }
    if (!quiet) announce(entry.name + ' selected. ' + entry.description);
  }
  routes.forEach(route => {
    const path = svg('path', {d:G.routePath(route, regions)});paths.set(route.id, path);routeLayer.append(path);
  });
  regions.forEach(entry => {
    const row = make('button', 'atlas-region');row.type = 'button';row.setAttribute('aria-pressed', 'false');
    row.append(make('strong', '', entry.name), make('small', '', entry.code || 'REGION RECORD'));
    row.addEventListener('click', () => select(entry.id, {center:true}));rows.set(entry.id, row);byId('map-region-list').append(row);
    if (!G.validMarker(entry.marker)) return;
    const pin = make('button', 'atlas-pin' + (entry.marker.unknown ? ' is-unknown' : '') + (entry.marker.labelPosition === 'above' ? ' label-above' : ''));
    pin.type = 'button';pin.setAttribute('aria-label', 'Inspect ' + entry.name);pin.setAttribute('aria-pressed', 'false');
    pin.style.left = entry.marker.x + '%';pin.style.top = entry.marker.y + '%';
    const target = make('span', 'pin-target');target.setAttribute('aria-hidden', 'true');
    pin.append(target, make('span', 'pin-label', entry.marker.label || entry.name));
    pin.addEventListener('click', () => select(entry.id));
    byId('map-markers').append(pin);pins.set(entry.id, pin);
    byId('map-mini-pins').append(svg('circle', {cx:entry.marker.x*12, cy:entry.marker.y*9, r:15}));
  });
  if (!regions.length) byId('map-region-list').append(make('p', 'atlas-empty', 'No regions catalogued yet.'));
  byId('map-back').addEventListener('click', () => navigate('overview'));
  byId('map-next').addEventListener('click', () => navigate('mission'));
  byId('map-toggle-routes').addEventListener('click', () => {
    showRoutes = !showRoutes;paint();
    byId('map-toggle-routes').setAttribute('aria-pressed', String(showRoutes));
  });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const mode = event.key === 'ArrowRight' ? 'mission' : 'overview';
    if (mode !== cameraMode && (mode === 'overview' || plotted.length)) navigate(mode);
  });
  function resize() {
    const box = viewport.getBoundingClientRect();
    if (!box.width || !box.height) return;
    width = box.width;
    height = box.height;
    navigate(cameraMode, {animate:false});
  }
  reducedMotion.addEventListener('change', () => navigate(cameraMode, {animate:false}));
  resize();
  new ResizeObserver(resize).observe(viewport);
  const hashRegion = () => new URLSearchParams(location.hash.slice(1)).get('region');
  const initial = regions.find(entry => entry.id === hashRegion()) || regions[0];
  if (initial) select(initial.id, {center:!!hashRegion(),updateHash:false,quiet:true});
  window.addEventListener('hashchange', () => { const id = hashRegion();if (id) select(id,{center:true,updateHash:false}); });
})();
