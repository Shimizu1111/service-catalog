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
  if (industries.length === 0) { container.innerHTML = ''; return; }
  const options = [{ value: 'all', label: '全業界' }, ...industries.map(i => ({ value: i, label: i }))];
  container.innerHTML = `<select class="industry-select" onchange="setIndustry(this.value)">${
    options.map(o => `<option value="${esc(o.value)}" ${currentIndustry === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
  }</select>`;
}

function renderGrid(items) {
  const grid = document.getElementById('serviceGrid');
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>サービスが見つかりません</p></div>';
    return;
  }
  grid.innerHTML = items.map(s => `
    <div class="card">
      ${s.images && s.images.length > 0 ? `<div class="card-images" data-id="${esc(s.id)}">
        ${s.images.map((img, i) => `<img src="${esc(img)}" alt="${esc(s.name)}" class="${i === 0 ? 'active' : ''}">`).join('')}
        ${s.images.length > 1 ? `<div class="image-dots">${s.images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="showSlide('${esc(s.id)}',${i})"></span>`).join('')}</div>` : ''}
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
          ${s.demo_url ? `<a href="${esc(s.demo_url)}" target="_blank">デモ動画</a>` : ''}
          ${s.url ? `<a href="${esc(s.url)}" target="_blank">開く</a>` : ''}
          ${s.repo ? `<a href="${esc(s.repo)}" target="_blank">リポジトリ</a>` : ''}
        </span>
      </div>
    </div>
  `).join('');
}

function statusLabel(status) {
  const labels = { active: '稼働中', wip: '開発中', archived: 'アーカイブ' };
  return labels[status] || status;
}

function setFilter(f) { currentFilter = f; render(); }
function setIndustry(i) { currentIndustry = i; render(); }

function showSlide(serviceId, index) {
  const container = document.querySelector(`.card-images[data-id="${serviceId}"]`);
  if (!container) return;
  container.querySelectorAll('img').forEach((img, i) => img.classList.toggle('active', i === index));
  container.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

document.getElementById('searchBox').addEventListener('input', render);
init();
