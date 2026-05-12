const API = '/api/services';
let services = [];
let currentFilter = 'all';
let pendingImages = [];

function getToken() {
  return sessionStorage.getItem('admin_token') || '';
}

function authHeaders(extra = {}) {
  return { 'Authorization': `Bearer ${getToken()}`, ...extra };
}

// --- Login ---
async function login() {
  const password = document.getElementById('loginPassword').value;
  if (!password) return;

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.status === 401) {
      document.getElementById('loginError').textContent = 'パスワードが正しくありません';
      return;
    }

    if (!res.ok) throw new Error();

    sessionStorage.setItem('admin_token', password);
    showAdmin();
  } catch {
    document.getElementById('loginError').textContent = '通信エラーが発生しました';
  }
}

function logout() {
  sessionStorage.removeItem('admin_token');
  location.reload();
}

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminScreen').style.display = '';
  init();
}

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
    return matchSearch && matchFilter;
  });

  renderFilters();
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

function setFilter(f) { currentFilter = f; render(); }

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
  pendingImages = (s.images || []).map(url => ({ url }));
  renderImagePreviews();
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
  ['fName','fDesc','fUrl','fRepo','fTags','fDemoUrl','fCost'].forEach(id =>
    document.getElementById(id).value = ''
  );
  document.getElementById('fIndustry').value = '';
  document.getElementById('fStatus').value = 'active';
  document.getElementById('fPlatform').value = 'GitHub Pages';
  pendingImages = [];
  renderImagePreviews();
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
    images: [],
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
  const saveBtn = document.querySelector('.form-actions .btn-primary');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';

  try {
    // Upload new images
    const imageUrls = [];
    for (const img of pendingImages) {
      if (img.file) {
        const formData = new FormData();
        formData.append('file', img.file);
        const res = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getToken()}` },
          body: formData
        });
        if (!res.ok) throw new Error('画像のアップロードに失敗しました');
        const { url } = await res.json();
        imageUrls.push(url);
      } else {
        imageUrls.push(img.url);
      }
    }
    data.images = imageUrls;

    if (editId) {
      const res = await fetch(`${API}/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
      });
      if (res.status === 401) { alert('認証エラー: 再ログインしてください'); logout(); return; }
      if (!res.ok) throw new Error('更新に失敗しました');
    } else {
      const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
      });
      if (res.status === 401) { alert('認証エラー: 再ログインしてください'); logout(); return; }
      if (!res.ok) throw new Error('登録に失敗しました');
    }

    await loadServices();
    closeModal();
    render();
    showToast(editId ? '更新しました' : '追加しました');
  } catch (e) {
    alert('エラー: ' + e.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
  }
}

async function deleteService() {
  const editId = document.getElementById('editId').value;
  if (!editId || !confirm('このサービスを削除しますか？')) return;

  try {
    const res = await fetch(`${API}/${encodeURIComponent(editId)}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.status === 401) { alert('認証エラー: 再ログインしてください'); logout(); return; }
    if (!res.ok) throw new Error('削除に失敗しました');

    await loadServices();
    closeModal();
    render();
    showToast('削除しました');
  } catch (e) {
    alert('エラー: ' + e.message);
  }
}

// --- Image upload ---
function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  const remaining = 3 - pendingImages.length;
  if (remaining <= 0) {
    alert('画像は最大3枚までです');
    event.target.value = '';
    return;
  }

  const toAdd = files.slice(0, remaining);
  for (const file of toAdd) {
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} は5MBを超えています`);
      continue;
    }
    const url = URL.createObjectURL(file);
    pendingImages.push({ url, file });
  }

  event.target.value = '';
  renderImagePreviews();
}

function removeImage(index) {
  const img = pendingImages[index];
  if (img.file) URL.revokeObjectURL(img.url);
  pendingImages.splice(index, 1);
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviews');
  container.innerHTML = pendingImages.map((img, i) => `
    <div class="image-preview-item">
      <img src="${esc(img.url)}" alt="preview">
      <button type="button" class="image-remove-btn" onclick="removeImage(${i})">x</button>
    </div>
  `).join('');

  const uploadLabel = document.getElementById('uploadLabel');
  uploadLabel.style.display = pendingImages.length >= 3 ? 'none' : '';
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

// セッションにトークンがあれば自動ログイン
if (getToken()) {
  showAdmin();
}
