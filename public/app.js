const api = {
  list: () => fetch('/api/links').then((r) => r.json()),
  save: (payload) =>
    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  delete: (alias) => fetch(`/api/links/${encodeURIComponent(alias)}`, { method: 'DELETE' }),
};

const form = document.getElementById('linkForm');
const linksContainer = document.getElementById('links');
const saveBtn = document.getElementById('saveBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editIndicator = document.getElementById('editIndicator');
const editAliasLabel = document.getElementById('editAlias');

let editing = null;

function toast(message) {
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  requestAnimationFrame(() => toastEl.classList.add('toast--visible'));
  setTimeout(() => toastEl.classList.remove('toast--visible'), 2400);
  setTimeout(() => toastEl.remove(), 2800);
}

function createLinkRow(link) {
  const row = document.createElement('div');
  row.className = 'linkRow';

  const linkMeta = document.createElement('div');
  linkMeta.className = 'linkMeta';

  const alias = document.createElement('div');
  alias.className = 'alias';

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = `go/${link.alias}`;

  const anchor = document.createElement('a');
  anchor.href = link.url;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.textContent = link.url;

  alias.appendChild(badge);
  alias.appendChild(anchor);

  const desc = document.createElement('div');
  desc.className = 'desc';
  desc.textContent = link.description || '';

  linkMeta.appendChild(alias);
  linkMeta.appendChild(desc);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const makeIcon = (svg, label) => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.type = 'button';
    btn.title = label;
    btn.innerHTML = svg;
    return btn;
  };

  const copyBtn = makeIcon(
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H5C3.895 1 3 1.895 3 3V16C3 17.105 3.895 18 5 18H16C17.105 18 18 17.105 18 16V3C18 1.895 17.105 1 16 1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M21 6H17C15.895 6 15 6.895 15 8V21C15 22.105 15.895 23 17 23H21C22.105 23 23 22.105 23 21V8C23 6.895 22.105 6 21 6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    'Copy go/' + link.alias
  );
  copyBtn.dataset.alias = link.alias;

  const editBtn = makeIcon(
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21H8.586C9.06066 21 9.51957 20.7893 9.85355 20.4553L19.2929 11.016C19.6834 10.6255 19.6834 9.99234 19.2929 9.60185L14.398 4.7069C14.0075 4.31641 13.3743 4.31641 12.9838 4.7069L3.54447 14.1462C3.21049 14.4802 3 14.9391 3 15.4137V21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 6L18 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'Edit go/' + link.alias
  );

  const deleteBtn = makeIcon(
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    'Delete go/' + link.alias
  );
  deleteBtn.dataset.alias = link.alias;

  actions.appendChild(copyBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  row.appendChild(linkMeta);
  row.appendChild(actions);

  copyBtn.addEventListener('click', async () => {
    const host = window.location.hostname === 'localhost' ? 'go' : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const url = `${window.location.protocol}//${host}${port}/${link.alias}`;
    await navigator.clipboard.writeText(url);
    toast('Copied ' + url);
  });

  editBtn.addEventListener('click', () => setEditMode(link));

  deleteBtn.addEventListener('click', async () => {
    if (!confirm(`Delete go/${link.alias}?`)) return;
    await api.delete(link.alias);
    toast('Deleted go/' + link.alias);
    if (editing === link.alias) {
      clearEditMode();
      form.reset();
    }
    refresh();
  });

  return row;
}

function clearEditMode() {
  editing = null;
  editIndicator.hidden = true;
  editIndicator.classList.remove('active');
  editAliasLabel.textContent = '';
  saveBtn.textContent = 'Save link';
  cancelEditBtn.hidden = true;
  form.alias.disabled = false;
}

function setEditMode(link) {
  editing = link.alias;
  editIndicator.hidden = false;
  editIndicator.classList.add('active');
  editAliasLabel.textContent = `go/${link.alias}`;
  saveBtn.textContent = 'Update';
  cancelEditBtn.hidden = false;
  form.alias.value = link.alias;
  form.url.value = link.url;
  form.description.value = link.description || '';
  form.alias.disabled = true;
}

async function refresh() {
  // Ensure we are not stuck in edit mode when the list refreshes.
  if (editing) {
    clearEditMode();
  }
  const links = await api.list();
  linksContainer.innerHTML = '';

  if (!links || links.length === 0) {
    const blank = document.createElement('div');
    blank.className = 'empty';
    blank.innerHTML = '<p>No links yet. Add one above to get started.</p>';
    linksContainer.appendChild(blank);
    return;
  }

  links
    .sort((a, b) => a.alias.localeCompare(b.alias))
    .forEach((link, index) => {
      const row = createLinkRow(link);
      row.style.animationDelay = `${index * 60}ms`;
      linksContainer.appendChild(row);
    });
}

cancelEditBtn.addEventListener('click', () => {
  clearEditMode();
  form.reset();
});

form.alias.addEventListener('input', () => {
  if (editing && form.alias.value.trim() !== editing) {
    clearEditMode();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const alias = form.alias.value.trim();
  const url = form.url.value.trim();
  const description = form.description.value.trim();
  if (!alias || !url) return;

  await api.save({ alias, url, description });

  if (editing) {
    toast('Updated go/' + editing);
    clearEditMode();
  } else {
    toast('Saved go/' + alias);
  }

  form.reset();
  refresh();
});

refresh();
