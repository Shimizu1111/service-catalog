let services = [];
let currentFilter = 'all';
let fileSha = null;

// --- Init ---
async function init() {
  loadSettings();
  await loadServices();
  render();
}

// --- Data Loading ---
async function loadServices() {
  try {
    const res = await fetch('services.json');
    services = await res.json();
  } catch {
    services = [];
  }
}

// --- Render ---
function render() {
  const query = document.getElementById('searchBox').value.toLowerCase();
  let filtered = services.filter(s => {
    const matchSearch = !query ||
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query));
    const matchFilter = currentFilter === 'all' || s.status === currentFilter;
    return matchSearch && matchFilter;
  });

  renderFilters();
  renderGrid(filtered);
  document.getElementById('serviceCount').textContent = `${filtered.length} / ${services.length} services`;
}

function renderFilters() {
  const container = document.getElementById('filterButtons');
  const statuses = ['all', 'active', 'wip', 'archived'];
  const labels = { all: 'All', active: 'Active', wip: 'WIP', archived: 'Archived' };
  container.innerHTML = statuses.map(s =>
    `<button class="filter-btn ${currentFilter === s ? 'active' : ''}" onclick="setFilter('${s}')">${labels[s]}</button>`
  ).join('');
}

function renderGrid(items) {
  const grid = document.getElementById('serviceGrid');
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No services found</p></div>';
    return;
  }
  grid.innerHTML = items.map(s => `
    <div class="card" onclick="openEditModal('${s.id}')">
      <div class="card-header">
        <span class="card-title">${esc(s.name)}</span>
        <span class="status-badge status-${s.status}">${s.status}</span>
      </div>
      <p class="card-desc">${esc(s.description)}</p>
      <div class="card-tags">
        ${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      </div>
      <div class="card-meta">
        <span>${esc(s.platform || '')}</span>
        <span class="card-links">
          ${s.url ? `<a href="${esc(s.url)}" target="_blank" onclick="event.stopPropagation()">Open</a>` : ''}
          ${s.repo ? `<a href="${esc(s.repo)}" target="_blank" onclick="event.stopPropagation()">Repo</a>` : ''}
        </span>
      </div>
    </div>
  `).join('');
}

function setFilter(f) {
  currentFilter = f;
  render();
}

// --- Modal ---
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Service';
  document.getElementById('editId').value = '';
  document.getElementById('deleteBtn').style.display = 'none';
  clearForm();
  document.getElementById('modal').classList.add('open');
}

function openEditModal(id) {
  const s = services.find(x => x.id === id);
  if (!s) return;
  document.getElementById('modalTitle').textContent = 'Edit Service';
  document.getElementById('editId').value = s.id;
  document.getElementById('fName').value = s.name;
  document.getElementById('fDesc').value = s.description;
  document.getElementById('fUrl').value = s.url || '';
  document.getElementById('fRepo').value = s.repo || '';
  document.getElementById('fTags').value = s.tags.join(', ');
  document.getElementById('fStatus').value = s.status;
  document.getElementById('fPlatform').value = s.platform || 'Other';
  document.getElementById('deleteBtn').style.display = 'inline-block';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function clearForm() {
  ['fName','fDesc','fUrl','fRepo','fTags'].forEach(id =>
    document.getElementById(id).value = ''
  );
  document.getElementById('fStatus').value = 'active';
  document.getElementById('fPlatform').value = 'GitHub Pages';
}

// --- Save / Delete ---
async function saveService() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { alert('Service Name is required'); return; }

  const editId = document.getElementById('editId').value;
  const data = {
    id: editId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description: document.getElementById('fDesc').value.trim(),
    url: document.getElementById('fUrl').value.trim(),
    repo: document.getElementById('fRepo').value.trim(),
    tags: document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
    status: document.getElementById('fStatus').value,
    platform: document.getElementById('fPlatform').value,
    createdAt: new Date().toISOString().split('T')[0]
  };

  if (editId) {
    const idx = services.findIndex(s => s.id === editId);
    if (idx >= 0) {
      data.createdAt = services[idx].createdAt;
      services[idx] = data;
    }
  } else {
    if (services.some(s => s.id === data.id)) {
      data.id += '-' + Date.now();
    }
    services.push(data);
  }

  await persistServices();
  closeModal();
  render();
}

async function deleteService() {
  const editId = document.getElementById('editId').value;
  if (!editId) return;
  if (!confirm('Delete this service?')) return;
  services = services.filter(s => s.id !== editId);
  await persistServices();
  closeModal();
  render();
}

// --- Persist to GitHub ---
async function persistServices() {
  const settings = getSettings();
  if (!settings.repo || !settings.token) {
    alert('Changes saved locally. Configure GitHub settings to sync to repository.');
    return;
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(services, null, 2) + '\n')));
  const path = 'services.json';
  const apiUrl = `https://api.github.com/repos/${settings.repo}/contents/${path}`;

  try {
    // Get current file SHA
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${settings.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const body = {
      message: `Update services.json`,
      content,
      branch: settings.branch || 'main'
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${settings.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message);
    }

    showToast('Saved to GitHub!');
  } catch (e) {
    alert('GitHub sync failed: ' + e.message);
  }
}

// --- Settings ---
function getSettings() {
  return {
    repo: localStorage.getItem('gh_repo') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
    token: localStorage.getItem('gh_token') || ''
  };
}

function loadSettings() {
  const s = getSettings();
  document.getElementById('ghRepo').value = s.repo;
  document.getElementById('ghBranch').value = s.branch;
  document.getElementById('ghToken').value = s.token;
}

function saveSettings() {
  localStorage.setItem('gh_repo', document.getElementById('ghRepo').value.trim());
  localStorage.setItem('gh_branch', document.getElementById('ghBranch').value.trim() || 'main');
  localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim());
  showToast('Settings saved');
}

function toggleSettings() {
  document.getElementById('settingsPanel').classList.toggle('open');
}

// --- Utils ---
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showToast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', bottom: '2rem', right: '2rem',
    background: '#1e293b', color: '#fff', padding: '0.75rem 1.5rem',
    borderRadius: '8px', fontSize: '0.9rem', zIndex: '999',
    animation: 'fadeIn 0.3s'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// --- Events ---
document.getElementById('searchBox').addEventListener('input', render);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

init();
