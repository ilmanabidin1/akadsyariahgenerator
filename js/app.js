/**
 * Application Main Controller & Navigation Logic
 */

let currentAkadType = "Murabahah";
let currentValidationResult = null;
let currentDraftText = "";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  // Load API Key to Settings Form
  const savedKey = DeepSeekService.getApiKey();
  if (savedKey) {
    document.getElementById("api-key-input").value = savedKey;
    document.getElementById("stat-ai-status").innerText = "DeepSeek API (Connected)";
  } else {
    document.getElementById("stat-ai-status").innerText = "AI Simulator (Ready)";
  }

  // Trigger initial validation
  triggerValidation();
});

// Tab Switcher
function switchTab(tabId) {
  const tabs = ['dashboard', 'generator', 'document', 'verification', 'audit', 'settings'];
  tabs.forEach(t => {
    const viewEl = document.getElementById(`view-${t}`);
    const navEl = document.getElementById(`nav-${t}`);
    if (viewEl) viewEl.style.display = (t === tabId) ? 'block' : 'none';
    if (navEl) {
      if (t === tabId) navEl.classList.add('active');
      else navEl.classList.remove('active');
    }
  });

  const titles = {
    'dashboard': 'Dashboard Overview',
    'generator': 'Form Penyusunan Akad Syariah Dinamis',
    'document': 'Pratinjau & Cetak Dokumen Akad Syariah',
    'verification': 'Verifikasi Legal Officer & Dewan Pengawas Syariah',
    'audit': 'Immutable Audit Trail & Blockchain Status',
    'settings': 'Pengaturan DeepSeek AI API'
  };
  document.getElementById('page-title').innerText = titles[tabId] || 'Akad Syariah System';
}

// User Role Change
function changeUserRole(roleName) {
  document.getElementById('current-role-display').innerText = `Role: ${roleName}`;
}

// Start Akad Action from Dashboard
function startAkad(type) {
  document.getElementById('form-akad-type').value = type;
  onAkadTypeChange(type);
  switchTab('generator');
}

// Form Dynamic Inputs rendering based on Akad type
function onAkadTypeChange(type) {
  currentAkadType = type;
  const container = document.getElementById('dynamic-fields');

  if (type === 'Murabahah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Nama Barang / Aset Objek Jual Beli</label>
        <input type="text" id="namaBarang" class="form-control" value="Laptop Kerja HP Pavilion" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Harga Pokok Pembelian (Rp)</label>
        <input type="number" id="hargaBeli" class="form-control" value="10000000" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Margin Keuntungan Koperasi (Rp)</label>
        <input type="number" id="margin" class="form-control" value="1500000" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Tenor / Jangka Waktu (Bulan)</label>
        <input type="number" id="tenor" class="form-control" value="12" oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Qardh') {
    container.innerHTML = `
      <div class="form-group">
        <label>Jumlah Pinjaman Pokok (Rp)</label>
        <input type="number" id="jumlahPinjaman" class="form-control" value="2000000" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Biaya Administrasi Riil / Cetak Dokumen (Rp)</label>
        <input type="number" id="biayaAdmin" class="form-control" value="25000" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jatuh Tempo Pengembalian</label>
        <input type="text" id="jatuhTempo" class="form-control" value="6 Bulan" oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Mudharabah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Sektor / Bidang Usaha Mudharabah</label>
        <input type="text" id="bidangUsaha" class="form-control" value="Usaha Kuliner / Restoran Syariah" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jumlah Modal Disetor Shahibul Maal (Rp)</label>
        <input type="number" id="jumlahModal" class="form-control" value="50000000" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pengelola / Mudharib (%)</label>
        <input type="number" id="nisbahPengelola" class="form-control" value="60" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pemodal / Koperasi (%)</label>
        <input type="number" id="nisbahPemodal" class="form-control" value="40" oninput="triggerValidation()">
      </div>
    `;
  }

  triggerValidation();
}

// Trigger Realtime Validation Engine
function triggerValidation() {
  const data = getFormData();
  let result;

  if (currentAkadType === 'Murabahah') {
    result = SyariahRulesEngine.validateMurabahah(data);
  } else if (currentAkadType === 'Qardh') {
    result = SyariahRulesEngine.validateQardh(data);
  } else {
    result = SyariahRulesEngine.validateMudharabah(data);
  }

  currentValidationResult = result;
  renderValidationPanel(result);
}

// Get Form Data Helper
function getFormData() {
  const data = {
    tipeAkad: currentAkadType,
    pihakPertama: document.getElementById('pihakPertama')?.value || '',
    pihakKedua: document.getElementById('pihakKedua')?.value || ''
  };

  if (currentAkadType === 'Murabahah') {
    data.namaBarang = document.getElementById('namaBarang')?.value || '';
    data.hargaBeli = document.getElementById('hargaBeli')?.value || 0;
    data.margin = document.getElementById('margin')?.value || 0;
    data.tenor = document.getElementById('tenor')?.value || 1;
  } else if (currentAkadType === 'Qardh') {
    data.jumlahPinjaman = document.getElementById('jumlahPinjaman')?.value || 0;
    data.biayaAdmin = document.getElementById('biayaAdmin')?.value || 0;
    data.jatuhTempo = document.getElementById('jatuhTempo')?.value || '';
  } else if (currentAkadType === 'Mudharabah') {
    data.bidangUsaha = document.getElementById('bidangUsaha')?.value || '';
    data.jumlahModal = document.getElementById('jumlahModal')?.value || 0;
    data.nisbahPengelola = parseFloat(document.getElementById('nisbahPengelola')?.value || 0);
    data.nisbahPemodal = parseFloat(document.getElementById('nisbahPemodal')?.value || 0);
  }

  return data;
}

// Render Validation Output Panel
function renderValidationPanel(result) {
  const badgeContainer = document.getElementById('score-badge-container');
  const checklistContainer = document.getElementById('validation-checklist');

  let badgeClass = 'score-high';
  if (result.score < 60) badgeClass = 'score-low';
  else if (result.score < 85) badgeClass = 'score-medium';

  badgeContainer.innerHTML = `<span class="score-badge ${badgeClass}">Skor Kepatuhan: ${result.score}%</span>`;

  let html = '';
  result.checks.forEach(check => {
    let icon = '✅';
    let iconClass = 'check-pass';
    if (check.status === 'fail') { icon = '❌'; iconClass = 'check-fail'; }
    else if (check.status === 'warn') { icon = '⚠️'; iconClass = 'check-warn'; }

    html += `
      <div class="checklist-item">
        <span class="check-icon ${iconClass}">${icon}</span>
        <div>
          <strong>${check.rule}</strong>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">${check.message}</p>
        </div>
      </div>
    `;
  });

  checklistContainer.innerHTML = html;
}

// Submit Form - Generate Redaksi Akad via DeepSeek AI Service
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = getFormData();

  // Call DeepSeek AI Service
  alert("Mengisi redaksi akad syariah berbasis AI DeepSeek & Rule Engine...");
  currentDraftText = await DeepSeekService.generateAkadClause(formData, currentValidationResult);
  
  viewGeneratedDocument();
}

// Display Generated Document
function viewGeneratedDocument() {
  if (!currentDraftText) {
    currentDraftText = DeepSeekService.generateSmartMockDraft(getFormData());
  }

  const formData = getFormData();
  document.getElementById('doc-pihakkedua-sign').innerText = formData.pihakKedua || 'Nama Anggota';
  
  // Format text into paragraphs HTML
  const formattedHtml = currentDraftText.split('\n').map(p => {
    if (p.startsWith('AKAD') || p.startsWith('BISMILLAHIRRAHMANIRRAHIM')) {
      return `<h3 style="text-align:center; margin: 1rem 0;">${p}</h3>`;
    } else if (p.startsWith('PASAL')) {
      return `<h4 style="margin-top:1.25rem; border-bottom:1px solid #ccc; padding-bottom:4px;">${p}</h4>`;
    } else {
      return `<p style="margin-bottom:0.75rem; text-align:justify;">${p}</p>`;
    }
  }).join('');

  document.getElementById('document-content-area').innerHTML = formattedHtml;
  switchTab('document');
}

// Approve Document
function approveContract() {
  document.getElementById('approval-stamp').innerHTML = "✅ DISETUJUI DPS & LEGAL KOPI";
  document.getElementById('approval-stamp').style.borderColor = "var(--success)";
  document.getElementById('approval-stamp').style.color = "var(--success)";
  alert("Dokumen Akad Syariah berhasil disetujui, diberi stempel legalitas, dan dicatat ke Audit Trail!");
}

// Settings Action
function saveSettings() {
  const key = document.getElementById('api-key-input').value;
  DeepSeekService.setApiKey(key);
  alert("API Key DeepSeek berhasil disimpan!");
  document.getElementById("stat-ai-status").innerText = key ? "DeepSeek API (Connected)" : "AI Simulator (Ready)";
}
