const search = document.querySelector('#glossary-search');
if (search) {
  const entries = [...document.querySelectorAll('.glossary-entry')];
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('en');
    entries.forEach(entry => { entry.hidden = !entry.textContent.toLocaleLowerCase('en').includes(query); });
    document.querySelector('#search-empty').hidden = entries.some(entry => !entry.hidden);
  });
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
if (tabs.length) {
  function activate(tab, updateHash = true) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (updateHash) history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
  }
  function fromHash() {
    activate(tabs.find(tab => '#' + tab.getAttribute('aria-controls') === location.hash) || tabs[0], false);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (next) { event.preventDefault(); activate(next); next.focus(); }
    });
  });
  window.addEventListener('hashchange', fromHash);
  fromHash();
}

// Preserve old bookmarked glossary anchors after the English rename.
const aliases = { 'cs-brainstem': 'isv-coherence', estrazione: 'extraction', 'impero-umano': 'human-empire' };
const target = aliases[location.hash.slice(1)];
if (target && document.getElementById(target)) {
  history.replaceState(null, '', '#' + target);
  document.getElementById(target).scrollIntoView();
}
