/* Shared search logic: no network, framework or browser storage required. */
(() => {
  'use strict';
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = query => [...new Set(normalize(query).match(/[\p{L}\p{N}]+/gu) || [])];

  function createRecords(index, catalog) {
    const records = index.map(record => ({ ...record }));
    function add(title, href, text, category) {
      const existing = records.find(record => record.href === href && record.title === title);
      if (existing) { existing.text += ' ' + text; existing.category = category; }
      else records.push({ title, href, text, category });
    }
    for (const entry of catalog.entities || []) {
      add(entry.name, entry.href || 'lifeforms.html#' + entry.category,
        [entry.id, ...(entry.fields || []).flat(), ...(entry.fieldNotes?.paragraphs || [])].join(' '), 'Life Forms');
    }
    for (const entry of catalog.regions || []) {
      add(entry.name, 'mappa.html#region=' + encodeURIComponent(entry.id),
        [entry.code, entry.description, entry.marker?.label].filter(Boolean).join(' '), 'Map');
    }
    for (const entry of catalog.structures || []) {
      add(entry.name, entry.href || 'structures.html',
        [entry.id, entry.description, entry.discoveryStatus].join(' '), 'Structures');
    }
    for (const entry of catalog.logs || []) {
      add('Cycle ' + String(entry.cycle).padStart(3, '0') + (entry.title ? ': ' + entry.title : ''), entry.href, (entry.paragraphs || []).join(' '), 'Log');
    }
    for (const entry of catalog.shipState || []) {
      add(entry.name, 'primer.html#ship-state-heading', entry.description + ' ' + entry.status, 'Ship State');
    }
    return records.map(record => ({ ...record, searchTitle: normalize(record.title), searchText: normalize(record.text) }));
  }

  function find(records, query) {
    const words = terms(query);
    if (!words.length) return [];
    const phrase = words.join(' ');
    return records.map(record => {
      if (!words.every(word => record.searchTitle.includes(word) || record.searchText.includes(word))) return null;
      const score = (record.searchTitle === phrase ? 100 : 0)
        + (record.searchTitle.includes(phrase) ? 30 : 0)
        + words.reduce((sum, word) => sum + (record.searchTitle.includes(word) ? 10 : 1), 0);
      return { ...record, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }

  function excerpt(record, query) {
    const positions = terms(query).map(word => normalize(record.text).indexOf(word)).filter(position => position >= 0);
    let start = positions.length ? Math.max(0, Math.min(...positions) - 65) : 0;
    if (start) { const space = record.text.indexOf(' ', start); if (space >= 0) start = space + 1; }
    const end = Math.min(record.text.length, start + 240);
    return (start ? '…' : '') + record.text.slice(start, end).trim() + (end < record.text.length ? '…' : '');
  }
  const api = { normalize, terms, createRecords, find, excerpt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HGSearch = api;
})();
