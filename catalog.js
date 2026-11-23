/* Lists and metrics are derived from catalog-data.js, including when opened via file://. */
(() => {
  'use strict';
  const pad = (value, digits = 2) => String(value).padStart(digits, '0');

  function summarize(data) {
    const latest = data.logs.reduce((current, entry) =>
      current === null || entry.cycle > current.cycle ? entry : current, null);
    return { regions: data.regions.filter(entry => entry.known !== false).length, entities: data.entities.length,
      structures: data.structures.length, cycle: latest === null ? null : latest.cycle, latest };
  }

  function render(data, doc = document) {
    const totals = summarize(data);
    const el = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const card = (entry, className = 'card') => {
      const node = el(entry.href ? 'a' : 'div', className);
      if (entry.href) node.setAttribute('href', entry.href);
      node.setAttribute('data-entry-id', entry.id);
      return node;
    };
    const fill = (key, records, make) => {
      doc.querySelectorAll(`[data-catalog-list="${key}"]`).forEach(container => {
        container.replaceChildren(...records.map(make));
        if (!records.length) container.append(el('p', 'catalog-empty', 'No records yet.'));
      });
    };
    fill('regions', data.regions, entry => {
      const node = card(entry);
      node.append(el('div', 'code', entry.code), el('h3', '', entry.name), el('p', '', entry.description));
      return node;
    });
    fill('structures', data.structures, entry => {
      const state = ['discovered', 'to-explore'].includes(entry.discoveryStatus) ? entry.discoveryStatus : 'unconfirmed';
      const labels = {discovered: '✓ Discovered', 'to-explore': '◇ To explore', unconfirmed: 'Status unconfirmed'};
      const node = card(entry, 'card structure-card structure-' + state);
      const heading = el('div', 'structure-card-heading');
      heading.append(el('div', 'code', entry.id), el('span', 'discovery-badge discovery-' + state, labels[state]));
      const preview = el('div', 'structure-preview');
      if (state === 'discovered' && entry.previewImage) {
        const image = el('img');image.setAttribute('src', entry.previewImage);
        image.setAttribute('alt', '');image.setAttribute('loading', 'lazy');preview.append(image);
      } else {
        const placeholder = el('div', 'structure-preview-placeholder');
        const symbol = el('span', 'structure-preview-symbol', state === 'to-explore' ? '?' : '—');
        symbol.setAttribute('aria-hidden', 'true');
        placeholder.append(symbol, el('span', 'structure-preview-label', state === 'to-explore' ? 'Unexplored' : 'No image available'));
        preview.append(placeholder);
      }
      const body = el('div', 'structure-card-body');
      body.append(heading, el('h3', '', entry.name), el('p', '', entry.description));
      node.append(preview, body);
      return node;
    });
    for (const category of ['individuals', 'galactosphere']) {
      fill(category, data.entities.filter(entry => entry.category === category), entry => {
        const node = card(entry, 'card thumb-card' + (category === 'galactosphere' ? ' galacto' : ''));
        const thumb = el('div', 'thumb');
        thumb.style.backgroundImage = `url(${JSON.stringify(entry.image)})`;
        const summary = el('div', 'entity-summary');
        const table = el('table', 'summary-table');
        table.setAttribute('aria-label', entry.name + ' summary');
        const body = el('tbody');
        for (const [label, value] of entry.fields) {
          const row = el('tr'), heading = el('th', '', label);
          heading.setAttribute('scope', 'row');
          row.append(heading, el('td', '', value));body.append(row);
        }
        table.append(body);summary.append(el('h3', '', entry.name), table);node.append(thumb, summary);
        return node;
      });
    }
    fill('logs', [...data.logs].sort((a, b) => b.cycle - a.cycle), entry => {
      const node = el('a', 'archive-entry log-preview-card');node.setAttribute('href', entry.href);
      const visual = el('div', 'log-preview-image');
      if (entry.previewImage) {
        const img = el('img');img.setAttribute('src', entry.previewImage);img.setAttribute('alt', '');
        img.setAttribute('loading', 'lazy');visual.append(img);
      } else {
        node.classList.add('log-cover-card');
        visual.classList.add('log-cover');
        visual.append(el('span', 'log-cover-cycle', 'CYCLE ' + pad(entry.cycle, 3)), el('h3', 'log-cover-title', entry.title || 'Mission record'));
      }
      node.setAttribute('aria-label', 'Cycle ' + pad(entry.cycle, 3) + (entry.title ? ' — ' + entry.title : ''));
      const title = el('div', 'log-preview-caption');
      if (entry.previewImage) title.append(el('h3', '', 'Cycle ' + pad(entry.cycle, 3) + (entry.title ? ' — ' + entry.title : '')));
      node.append(visual);
      if (entry.previewImage) node.append(title);
      return node;
    });
    const systemStates = {stable: '● Stable', damaged: '◆ Damaged', critical: '▲ Critical'};
    fill('systems', data.systems || [], entry => {
      const state = Object.prototype.hasOwnProperty.call(systemStates, entry.status) ? entry.status : 'unconfirmed';
      const node = el('article', 'system-card system-' + state);
      node.setAttribute('data-system-id', entry.id);
      node.append(el('div', 'system-status', 'Status'), el('span', 'status-chip status-' + state, systemStates[state] || 'Unconfirmed'), el('h3', '', entry.name), el('p', '', entry.description));
      return node;
    });
    fill('shipState', data.shipState || [], entry => {
      const state = Object.prototype.hasOwnProperty.call(systemStates, entry.status) ? entry.status : 'unconfirmed';
      const node = el('article', 'system-card system-' + state);
      node.setAttribute('data-ship-state-id', entry.id);
      node.append(el('h3', '', entry.name), el('span', 'status-chip status-' + state, systemStates[state] || 'Unconfirmed'), el('p', '', entry.description));
      return node;
    });
    doc.querySelectorAll('[data-entity-notes]').forEach(container => {
      const entry = data.entities.find(entity => entity.id === container.getAttribute('data-entity-notes'));
      container.replaceChildren();
      const heading = el('div', 'field-notes-heading');heading.append(el('h2', '', 'Field Notes'));
      const notes = entry && entry.fieldNotes;
      if (notes && Number.isInteger(notes.updatedThrough)) {
        const updated = el('span', 'field-notes-updated', 'Updated through ');
        const log = data.logs.find(log => log.cycle === notes.updatedThrough);
        const label = 'Cycle ' + pad(notes.updatedThrough, 3);
        if (log) { const a = el('a', '', label);a.setAttribute('href', log.href);updated.append(a); }
        else updated.append(doc.createTextNode(label));
        heading.append(updated);
      }
      container.append(heading);
      if (!notes || !notes.paragraphs.length) { container.append(el('p', '', 'No field notes recorded yet.'));return; }
      const cited = new Set();
      notes.paragraphs.forEach(text => {
        const paragraph = el('p');let end = 0;
        for (const match of text.matchAll(/\bCycle\s+(\d+)\b/g)) {
          paragraph.append(doc.createTextNode(text.slice(end, match.index)));
          const cycle = Number(match[1]), log = data.logs.find(log => log.cycle === cycle);
          if (log && !cited.has(cycle)) {
            const a = el('a', 'glossary-link', match[0]);a.setAttribute('href', log.href);paragraph.append(a);cited.add(cycle);
          } else paragraph.append(doc.createTextNode(match[0]));
          end = match.index + match[0].length;
        }
        paragraph.append(doc.createTextNode(text.slice(end)));container.append(paragraph);
      });
    });

    doc.querySelectorAll('[data-catalog-map]').forEach(map => {
      map.replaceChildren();
      for (const entry of data.regions) {
        if (!entry.marker) continue;
        const node = el(entry.href ? 'a' : 'div', 'zone' + (entry.marker.unknown ? ' unknown' : ''));
        if (entry.href) node.setAttribute('href', entry.href);
        node.style.left = entry.marker.x + '%';node.style.top = entry.marker.y + '%';
        node.append(el('div', 'dot'), el('div', 'label', entry.marker.label || entry.name));map.append(node);
      }
    });
    doc.querySelectorAll('[data-metric]').forEach(node => {
      const key = node.getAttribute('data-metric'), value = totals[key];
      node.textContent = value === null ? '—' : pad(value, key === 'cycle' ? 3 : 2);
    });
    doc.querySelectorAll('[data-region-total]').forEach(node => { node.textContent = pad(totals.regions) + ' records'; });
    doc.querySelectorAll('[data-current-cycle]').forEach(node => {
      node.textContent = totals.latest ? 'Cycle ' + pad(totals.cycle, 3) : 'No logs yet';
      if (totals.latest) node.setAttribute('href', totals.latest.href);
      else node.removeAttribute('href');
    });
    doc.querySelectorAll('[data-latest-log]').forEach(node => {
      node.replaceChildren();
      if (!totals.latest) { node.append(el('p', '', 'No mission logs recorded yet.'));return; }
      for (const paragraph of totals.latest.paragraphs) {
        const p = el('p');
        // Preserve the ship-name emphasis without interpreting catalogue text as HTML.
        const parts = paragraph.split('Coherence');
        parts.forEach((part, index) => { if (index) p.append(el('em', '', 'Coherence'));p.append(doc.createTextNode(part)); });
        node.append(p);
      }
    });
    return totals;
  }
  window.HGCatalog = { summarize, render };
  render(window.HG_CATALOG);
  // Returning from another page or a browser back/forward cache recomputes from the catalogue.
  window.addEventListener('pageshow', () => render(window.HG_CATALOG));
})();
