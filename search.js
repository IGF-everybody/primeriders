(() => {
  'use strict';
  const input = document.getElementById('wiki-query');
  const form = document.getElementById('wiki-search');
  const status = document.getElementById('wiki-search-status');
  const results = document.getElementById('wiki-results');
  if (!window.HG_SEARCH_INDEX || !window.HG_CATALOG || !window.HGSearch) {
    status.textContent = 'Search could not load. Reload the page to try again.';
    input.disabled = true;
    form.querySelector('button').disabled = true;
    return;
  }
  const records = HGSearch.createRecords(HG_SEARCH_INDEX, HG_CATALOG);
  function render() {
    const query = input.value.trim();
    results.replaceChildren();
    if (!HGSearch.terms(query).length) {
      status.textContent = 'Enter a name, a term or a phrase to search the entire database.';
      return;
    }
    const matches = HGSearch.find(records, query);
    status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for “${query}”` : `No results for “${query}”. Try fewer or different words.`;
    for (const record of matches) {
      const item = document.createElement('li');
      const category = document.createElement('span');
      category.className = 'search-category';
      category.textContent = record.category;
      const heading = document.createElement('h2');
      const link = document.createElement('a');
      link.href = record.href;
      link.textContent = record.title;
      heading.append(link);
      const excerpt = document.createElement('p');
      excerpt.textContent = HGSearch.excerpt(record, query);
      item.append(category, heading, excerpt);
      results.append(item);
    }
  }
  function updateURL() {
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    // Some browsers restrict history changes on file://; search still works.
    try { history.replaceState(null, '', url); } catch (_) { /* Local-file mode. */ }
  }
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { updateURL(); render(); }, 120);
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); clearTimeout(timer); updateURL(); render();
  });
  function restore() {
    clearTimeout(timer);
    input.value = new URLSearchParams(location.search).get('q') || '';
    render();
  }
  window.addEventListener('popstate', restore);
  restore();
})();
