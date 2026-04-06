// 配置
const FILES = [
	'core.json',
	'canBuild.json',
	'graphics.json',
	'attack.json',
	'turret.json',
	'projectile.json',
	'movement.json',
	'ai.json',
	'leg arm.json',
	'attachment.json',
	'action.json',
	'effect.json',
	'animation.json',
	'placementRule.json',
	'global_resource.json',
	'resource.json',
	'template.json',
	'decal.json',
	'LogicBoolean.json'
	
	];
let cats = {};               // 存储每个文件数据与DOM引用
let allVers = [];            // 所有版本列表
let selectedVers = new Set(); // 已选版本
let includeCommon = true;    // 是否包含通用项

// 加载所有数据
(async () => {
  await Promise.all(FILES.map(async file => {
    try {
      const resp = await fetch(`json/${file}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!Array.isArray(data)) throw new Error('格式错误');
      cats[file] = { raw: data, err: null };
    } catch (err) {
      cats[file] = { raw: null, err: err.message };
    }
  }));
  collectVersions();
  selectedVers.clear();
  allVers.forEach(v => selectedVers.add(v));
  includeCommon = true;
  renderAccordion();
  renderNav();
  buildVersionMenu();
  attachGlobalEvents();
  applyFilter();
})();

// 收集所有版本
function collectVersions() {
  const verSet = new Set();
  for (const f of FILES) {
    const data = cats[f]?.raw;
    if (!data) continue;
    for (const item of data) {
      const v = item.version;
      if (v && typeof v === 'string' && v.trim()) verSet.add(v.trim());
    }
  }
  allVers = [...verSet].sort();
}

// 根据版本过滤数据
function filterData(raw) {
  if (!raw) return [];
  return raw.filter(item => {
    const v = item.version;
    const isCommon = (v === undefined || v === null || v === '');
    if (isCommon) return includeCommon;
    return selectedVers.has(v);
  });
}

// 渲染所有折叠面板（首次）
function renderAccordion() {
  const container = document.getElementById('accordion');
  container.innerHTML = '';
  for (const f of FILES) {
    const { raw, err } = cats[f];
    const id = f.replace('.json', '');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'acc-item';
    const header = document.createElement('div');
    header.className = 'acc-header';
    const title = document.createElement('span');
    title.textContent = `📄 ${f.replace('.json', '')}`;
    header.appendChild(title);
    const badge = document.createElement('span');
    badge.className = 'badge';
    header.appendChild(badge);
    const icon = document.createElement('span');
    icon.className = 'acc-icon';
    icon.textContent = '▲';
    header.appendChild(icon);
    const content = document.createElement('div');
    content.className = 'acc-content';
    content.style.display = 'block';
    let tableWrapper, table;
    if (err) {
      const errDiv = document.createElement('div');
      errDiv.className = 'error-msg';
      errDiv.textContent = `❌ ${err}`;
      content.appendChild(errDiv);
    } else {
      tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-wrap';
      table = document.createElement('table');
      table.className = 'excel-table';
      table.innerHTML = `<thead><tr><th>📌 代码</th><th>📄 翻译</th><th>📖 介绍</th><th>💡 实例</th><th>🏷️ 版本</th></tr></thead><tbody></tbody>`;
      tableWrapper.appendChild(table);
      content.appendChild(tableWrapper);
    }
    itemDiv.appendChild(header);
    itemDiv.appendChild(content);
    container.appendChild(itemDiv);
    // 存储引用
    cats[f] = { ...cats[f], panel: itemDiv, content, icon, isOpen: true, table, badge, err };
    header.onclick = () => togglePanel(f);
  }
}

function togglePanel(file) {
  const c = cats[file];
  if (!c?.content) return;
  const isOpen = c.content.style.display === 'block';
  c.content.style.display = isOpen ? 'none' : 'block';
  c.icon.textContent = isOpen ? '▼' : '▲';
  c.isOpen = !isOpen;
}

// 导航栏
function renderNav() {
  const nav = document.getElementById('navBtns');
  nav.innerHTML = '';
  FILES.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.textContent = f.replace('.json', '');
    btn.onclick = () => {
      const c = cats[f];
      if (c?.content && c.content.style.display !== 'block') togglePanel(f);
      c?.panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    nav.appendChild(btn);
  });
}

// 更新表格内容 + 计数
function updateTable(file, filtered) {
  const c = cats[file];
  if (!c?.table) return;
  const tbody = c.table.querySelector('tbody');
  const newBody = document.createElement('tbody');
  if (!filtered || filtered.length === 0) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = '暂无符合版本条件的数据';
    row.appendChild(td);
    newBody.appendChild(row);
  } else {
    for (const it of filtered) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(it.code ?? '—')}</td>
		<td>${escapeHtml(it.code_translation ?? '—')}</td>
        <td>${escapeHtml(it.intro ?? it.description ?? '—')}</td>
        <td>${escapeHtml(it.example ?? it.instance ?? '—')}</td>
        <td>${(it.version && it.version !== '') ? escapeHtml(it.version) : '通用'}</td>
      `;
      newBody.appendChild(tr);
    }
  }
  tbody.replaceWith(newBody);
  if (c.badge) c.badge.textContent = ` (${filtered?.length ?? 0} 条)`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// 全局过滤
function applyFilter() {
  for (const f of FILES) {
    const c = cats[f];
    if (!c?.raw) continue;
    const filtered = filterData(c.raw);
    updateTable(f, filtered);
  }
}

// 版本下拉菜单构建
function buildVersionMenu() {
  const list = document.getElementById('verList');
  if (!list) return;
  list.innerHTML = '';
  // 通用选项
  const commonDiv = document.createElement('div');
  commonDiv.className = 'ver-item';
  const commonChk = document.createElement('input');
  commonChk.type = 'checkbox';
  commonChk.id = 'verCommon';
  commonChk.checked = includeCommon;
  commonChk.onchange = (e) => { includeCommon = e.target.checked; applyFilter(); };
  const commonLbl = document.createElement('label');
  commonLbl.htmlFor = 'verCommon';
  commonLbl.textContent = '📌 通用 (未指定版本)';
  commonDiv.appendChild(commonChk);
  commonDiv.appendChild(commonLbl);
  list.appendChild(commonDiv);
  // 版本列表
  for (const v of allVers) {
    const div = document.createElement('div');
    div.className = 'ver-item';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = `v_${v.replace(/\s/g, '_')}`;
    chk.value = v;
    chk.checked = selectedVers.has(v);
    chk.onchange = (e) => {
      if (e.target.checked) selectedVers.add(v);
      else selectedVers.delete(v);
      applyFilter();
    };
    const lbl = document.createElement('label');
    lbl.htmlFor = chk.id;
    lbl.textContent = v;
    div.appendChild(chk);
    div.appendChild(lbl);
    list.appendChild(div);
  }
}

// 全选/取消全选逻辑
function selectAll() {
  includeCommon = true;
  selectedVers.clear();
  for (const v of allVers) selectedVers.add(v);
  const commonChk = document.getElementById('verCommon');
  if (commonChk) commonChk.checked = true;
  for (const v of allVers) {
    const chk = document.getElementById(`v_${v.replace(/\s/g, '_')}`);
    if (chk) chk.checked = true;
  }
  applyFilter();
}
function deselectAll() {
  includeCommon = false;
  selectedVers.clear();
  const commonChk = document.getElementById('verCommon');
  if (commonChk) commonChk.checked = false;
  for (const v of allVers) {
    const chk = document.getElementById(`v_${v.replace(/\s/g, '_')}`);
    if (chk) chk.checked = false;
  }
  applyFilter();
}

// 全局事件: 下拉开关 + 复制(委托) + 全选按钮
function attachGlobalEvents() {
  const btn = document.getElementById('verBtn');
  const menu = document.getElementById('verMenu');
  if (btn && menu) {
    btn.onclick = (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'block' ? 'none' : 'block'; };
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) menu.style.display = 'none';
    });
  }
  document.getElementById('selectAll')?.addEventListener('click', selectAll);
  document.getElementById('deselectAll')?.addEventListener('click', deselectAll);
  
  // 复制代码委托 (点击表格第一个td)
  document.getElementById('accordion')?.addEventListener('click', async (e) => {
    const td = e.target.closest('td');
    if (td && td.parentElement && td.parentElement.firstElementChild === td) {
      const code = td.textContent?.trim();
      if (code && code !== '—' && code !== '暂无符合版本条件的数据') {
        try {
          await navigator.clipboard.writeText(code);
          showToast(`✅ 已复制: ${code.slice(0, 50)}${code.length > 50 ? '…' : ''}`);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast(`📋 已复制: ${code.slice(0, 50)}${code.length > 50 ? '…' : ''}`);
        }
      } else if (code && code !== '—') showToast('无有效代码', false);
    }
  });
}

function showToast(msg, ok = true) {
  let toast = document.getElementById('copyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.backgroundColor = ok ? '#1e6faf' : '#b91c1c';
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2000);
}