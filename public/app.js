const API = '/api/services';
let services = [];
let currentFilter = 'all';
let currentIndustry = 'all';
let currentRecommended = null;

const RECOMMENDED_FILTERS = [
  { label: '転職', keyword: '転職' },
  { label: 'インバウンド業界', keyword: 'インバウンド' },
  { label: '不動産', keyword: '不動産' },
  { label: 'SNS運用', keyword: 'SNS' },
  { label: '営業', keyword: '営業' },
  { label: '建築見積もり', keyword: '建築' },
];

// --- Init ---
async function init() {
  await loadServices();
  render();
}

async function loadServices() {
  try {
    const res = await fetch(API);
    services = await res.json();
  } catch {
    services = [];
  }
}

// --- Render ---
function render() {
  const query = document.getElementById('searchBox').value.toLowerCase();
  const filtered = services.filter(s => {
    const matchSearch = !query ||
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query));
    const matchFilter = currentFilter === 'all' || s.status === currentFilter;
    const matchIndustry = currentIndustry === 'all' || s.industry === currentIndustry;
    const matchRecommended = !currentRecommended ||
      s.name.includes(currentRecommended) ||
      s.description.includes(currentRecommended) ||
      (s.industry && s.industry.includes(currentRecommended)) ||
      s.tags.some(t => t.includes(currentRecommended));
    return matchSearch && matchFilter && matchIndustry && matchRecommended;
  });

  renderFilters();
  renderRecommendedFilters();
  renderIndustryFilter();
  renderGrid(filtered);
  document.getElementById('serviceCount').textContent = `${filtered.length} / ${services.length} 件`;
}

function renderFilters() {
  const container = document.getElementById('filterButtons');
  const statuses = ['all', 'active', 'wip', 'archived'];
  const labels = { all: 'すべて', active: '稼働中', wip: '開発中', archived: 'アーカイブ' };
  container.innerHTML = statuses.map(s =>
    `<button class="filter-btn ${currentFilter === s ? 'active' : ''}" onclick="setFilter('${s}')">${labels[s]}</button>`
  ).join('');
}

function renderRecommendedFilters() {
  const container = document.getElementById('recommendedFilters');
  container.innerHTML = RECOMMENDED_FILTERS.map(f =>
    `<button class="filter-btn recommended-btn ${currentRecommended === f.keyword ? 'active' : ''}" onclick="setRecommended('${f.keyword}')">${f.label}</button>`
  ).join('');
}

function setRecommended(keyword) {
  currentRecommended = currentRecommended === keyword ? null : keyword;
  render();
}

function renderIndustryFilter() {
  const container = document.getElementById('industryFilter');
  const industries = [...new Set(services.map(s => s.industry).filter(Boolean))].sort();

  if (industries.length === 0) {
    container.innerHTML = '';
    return;
  }

  const options = [{ value: 'all', label: '全業界' }, ...industries.map(i => ({ value: i, label: i }))];
  container.innerHTML = `<select class="industry-select" onchange="setIndustry(this.value)">${
    options.map(o => `<option value="${esc(o.value)}" ${currentIndustry === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
  }</select>`;
}

function renderGrid(items) {
  const grid = document.getElementById('serviceGrid');
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>サービスが見つかりません</p><p style="font-size:0.9rem">「+ サービス追加」から登録してください</p></div>';
    return;
  }
  grid.innerHTML = items.map(s => `
    <div class="card" onclick="openEditModal('${esc(s.id)}')">
      ${s.images && s.images.length > 0 ? `<div class="card-images" data-id="${esc(s.id)}">
        ${s.images.map((img, i) => `<img src="${esc(img)}" alt="${esc(s.name)}" class="${i === 0 ? 'active' : ''}">`).join('')}
        ${s.images.length > 1 ? `<div class="image-dots">${s.images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation();showSlide('${esc(s.id)}',${i})"></span>`).join('')}</div>` : ''}
      </div>` : ''}
      <div class="card-header">
        <span class="card-title">${esc(s.name)}</span>
        <span class="status-badge status-${s.status}">${statusLabel(s.status)}</span>
      </div>
      <p class="card-desc">${esc(s.description)}</p>
      ${s.cost ? `<div class="card-cost">外注費: ${esc(s.cost)}</div>` : ''}
      <div class="card-tags">
        ${s.industry ? `<span class="industry-badge">${esc(s.industry)}</span>` : ''}
        ${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      </div>
      <div class="card-meta">
        <span>${esc(s.platform || '')}</span>
        <span class="card-links">
          ${s.demo_url ? `<a href="${esc(s.demo_url)}" target="_blank" onclick="event.stopPropagation()">デモ動画</a>` : ''}
          ${s.url ? `<a href="${esc(s.url)}" target="_blank" onclick="event.stopPropagation()">開く</a>` : ''}
          ${s.repo ? `<a href="${esc(s.repo)}" target="_blank" onclick="event.stopPropagation()">リポジトリ</a>` : ''}
        </span>
      </div>
    </div>
  `).join('');
}

function statusLabel(status) {
  const labels = { active: '稼働中', wip: '開発中', archived: 'アーカイブ' };
  return labels[status] || status;
}

function setFilter(f) {
  currentFilter = f;
  render();
}

function setIndustry(i) {
  currentIndustry = i;
  render();
}

// --- Modal ---
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'サービス追加';
  document.getElementById('editId').value = '';
  document.getElementById('deleteBtn').style.display = 'none';
  clearForm();
  document.getElementById('modal').classList.add('open');
}

function openEditModal(id) {
  const s = services.find(x => x.id === id);
  if (!s) return;
  document.getElementById('modalTitle').textContent = 'サービス編集';
  document.getElementById('editId').value = s.id;
  document.getElementById('fName').value = s.name;
  document.getElementById('fDesc').value = s.description;
  document.getElementById('fUrl').value = s.url || '';
  document.getElementById('fRepo').value = s.repo || '';
  document.getElementById('fIndustry').value = s.industry || '';
  document.getElementById('fTags').value = s.tags.join(', ');
  const imgs = s.images || [];
  document.getElementById('fImage0').value = imgs[0] || '';
  document.getElementById('fImage1').value = imgs[1] || '';
  document.getElementById('fImage2').value = imgs[2] || '';
  document.getElementById('fDemoUrl').value = s.demo_url || '';
  document.getElementById('fCost').value = s.cost || '';
  document.getElementById('fStatus').value = s.status;
  document.getElementById('fPlatform').value = s.platform || 'Other';
  document.getElementById('deleteBtn').style.display = 'inline-block';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function clearForm() {
  ['fName','fDesc','fUrl','fRepo','fTags','fImage0','fImage1','fImage2','fDemoUrl','fCost'].forEach(id =>
    document.getElementById(id).value = ''
  );
  document.getElementById('fIndustry').value = '';
  document.getElementById('fStatus').value = 'active';
  document.getElementById('fPlatform').value = 'GitHub Pages';
}

// --- API calls ---
function getFormData() {
  return {
    name: document.getElementById('fName').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    url: document.getElementById('fUrl').value.trim(),
    repo: document.getElementById('fRepo').value.trim(),
    industry: document.getElementById('fIndustry').value,
    tags: document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
    images: [
      document.getElementById('fImage0').value.trim(),
      document.getElementById('fImage1').value.trim(),
      document.getElementById('fImage2').value.trim(),
    ].filter(Boolean),
    demo_url: document.getElementById('fDemoUrl').value.trim(),
    cost: document.getElementById('fCost').value.trim(),
    status: document.getElementById('fStatus').value,
    platform: document.getElementById('fPlatform').value,
  };
}

async function saveService() {
  const data = getFormData();
  if (!data.name) { alert('サービス名は必須です'); return; }

  const editId = document.getElementById('editId').value;

  try {
    if (editId) {
      const res = await fetch(`${API}/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('更新に失敗しました');
    } else {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('登録に失敗しました');
    }

    await loadServices();
    closeModal();
    render();
    showToast(editId ? '更新しました' : '追加しました');
  } catch (e) {
    alert('エラー: ' + e.message);
  }
}

async function deleteService() {
  const editId = document.getElementById('editId').value;
  if (!editId || !confirm('このサービスを削除しますか？')) return;

  try {
    const res = await fetch(`${API}/${encodeURIComponent(editId)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('削除に失敗しました');

    await loadServices();
    closeModal();
    render();
    showToast('削除しました');
  } catch (e) {
    alert('エラー: ' + e.message);
  }
}

// --- Image slider ---
function showSlide(serviceId, index) {
  const container = document.querySelector(`.card-images[data-id="${serviceId}"]`);
  if (!container) return;
  container.querySelectorAll('img').forEach((img, i) => img.classList.toggle('active', i === index));
  container.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
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
    borderRadius: '8px', fontSize: '0.9rem', zIndex: '999'
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
