/**
 * Application Main Controller & Navigation Logic
 */

let currentAkadType = "Murabahah";
let currentValidationResult = null;
let currentDraftText = "";
let createdContracts = [];

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  onAkadTypeChange("Murabahah");
  updateDashboardStats();
});

// Tab Switcher
function switchTab(tabId) {
  const tabs = ['dashboard', 'generator', 'document', 'verification', 'audit'];
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
    'dashboard': 'Dashboard Utama',
    'generator': 'Form Penyusunan Akad Syariah Dinamis',
    'document': 'Pratinjau & Cetak Dokumen Akad Syariah',
    'verification': 'Verifikasi Legal Officer & Dewan Pengawas Syariah',
    'audit': 'Audit Trail & Log Status System'
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
        <label>Nama Barang / Objek Jual Beli</label>
        <input type="text" id="namaBarang" class="form-control" placeholder="Contoh: Truk Mitsubishi Canter Tangki Air" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Spesifikasi Barang</label>
        <input type="text" id="spesifikasi" class="form-control" placeholder="Contoh: Warna Putih Tahun 2020 On The Road" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Harga Pokok Pembelian (Rp)</label>
        <input type="number" id="hargaBeli" class="form-control" placeholder="Contoh: 270000000" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Margin Keuntungan Koperasi (Rp)</label>
        <input type="number" id="margin" class="form-control" placeholder="Contoh: 37000000" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Uang Muka / DP (Rp)</label>
        <input type="number" id="uangMuka" class="form-control" placeholder="Contoh: 50000000" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Tenor / Jangka Waktu (Bulan)</label>
        <input type="number" id="tenor" class="form-control" placeholder="Contoh: 23" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Identitas Saksi 1 & Saksi 2</label>
        <div style="display: flex; gap: 0.5rem;">
          <input type="text" id="saksi1" class="form-control" placeholder="Nama Saksi 1">
          <input type="text" id="saksi2" class="form-control" placeholder="Nama Saksi 2">
        </div>
      </div>
    `;
  } else if (type === 'Qardh') {
    container.innerHTML = `
      <div class="form-group">
        <label>Jumlah Pinjaman Pokok (Rp)</label>
        <input type="number" id="jumlahPinjaman" class="form-control" placeholder="0" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Biaya Administrasi Riil / Cetak Dokumen (Rp)</label>
        <input type="number" id="biayaAdmin" class="form-control" placeholder="0" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jatuh Tempo Pengembalian</label>
        <input type="text" id="jatuhTempo" class="form-control" placeholder="Contoh: 6 Bulan" required oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Mudharabah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Sektor / Bidang Usaha Mudharabah</label>
        <input type="text" id="bidangUsaha" class="form-control" placeholder="Contoh: Usaha Perdagangan / Kuliner" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jumlah Modal Disetor Shahibul Maal (Rp)</label>
        <input type="number" id="jumlahModal" class="form-control" placeholder="0" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pengelola / Mudharib (%)</label>
        <input type="number" id="nisbahPengelola" class="form-control" placeholder="60" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pemodal / Koperasi (%)</label>
        <input type="number" id="nisbahPemodal" class="form-control" placeholder="40" required oninput="triggerValidation()">
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
    data.spesifikasi = document.getElementById('spesifikasi')?.value || '';
    data.hargaBeli = document.getElementById('hargaBeli')?.value || 0;
    data.margin = document.getElementById('margin')?.value || 0;
    data.uangMuka = document.getElementById('uangMuka')?.value || 0;
    data.tenor = document.getElementById('tenor')?.value || 1;
    data.saksi1 = document.getElementById('saksi1')?.value || '';
    data.saksi2 = document.getElementById('saksi2')?.value || '';
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

// Submit Form - Generate Redaksi Akad via Backend DeepSeek API
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = getFormData();

  const btnSubmit = document.getElementById('btn-submit-ai');
  const progressContainer = document.getElementById('progress-container');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercentText = document.getElementById('progress-percent-text');

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = "⏳ Menghubungi DeepSeek AI Server...";
  
  // Reset and show progress bar
  progressContainer.style.display = "block";
  progressBarFill.style.width = "5%";
  progressPercentText.innerText = "5%";
  progressStatusText.innerText = "⏳ Memvalidasi parameter transaksi...";

  // Simulated progressive updates
  let currentProgress = 5;
  const progressInterval = setInterval(() => {
    if (currentProgress < 30) {
      currentProgress += 5;
      progressStatusText.innerText = "🔍 Memverifikasi kepatuhan Rukun & Fatwa DSN-MUI...";
    } else if (currentProgress < 75) {
      currentProgress += 3;
      progressStatusText.innerText = "🤖 DeepSeek AI sedang menyusun klausul & rincian finansial...";
    } else if (currentProgress < 92) {
      currentProgress += 1;
      progressStatusText.innerText = "✍️ Memformat draft akad notaris & merapikan redaksi...";
    }
    progressBarFill.style.width = `${currentProgress}%`;
    progressPercentText.innerText = `${currentProgress}%`;
  }, 250);

  const textResult = await DeepSeekService.generateAkadClause(formData, currentValidationResult);
  
  clearInterval(progressInterval);

  if (textResult) {
    progressBarFill.style.width = "100%";
    progressPercentText.innerText = "100%";
    progressStatusText.innerText = "✅ Akad syariah berhasil disusun!";

    setTimeout(() => {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = "⚡ Susun Akad dengan DeepSeek AI";
      progressContainer.style.display = "none";
      
      currentDraftText = textResult;
      
      // Save to active contract list
      const newContract = {
        id: `AKD/${currentAkadType.substring(0,3).toUpperCase()}/${Math.floor(100000 + Math.random() * 900000)}`,
        type: currentAkadType,
        pihakKedua: formData.pihakKedua,
        date: new Date().toLocaleDateString('id-ID'),
        score: currentValidationResult.score,
        content: currentDraftText,
        status: 'DRAFT'
      };

      createdContracts.unshift(newContract);
      updateDashboardStats();
      addAuditLog(`Contract Generated via Template: ${newContract.id} (${newContract.type}) - Score: ${newContract.score}%`);
      viewGeneratedDocument();
    }, 600);
  } else {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = "⚡ Susun Akad dengan DeepSeek AI";
    progressContainer.style.display = "none";
  }
}

// Display Generated Document
function viewGeneratedDocument() {
  if (!currentDraftText) {
    alert("Belum ada draft akad yang dihasilkan. Silakan isi form dan klik 'Susun Akad dengan DeepSeek AI'.");
    return;
  }

  const formData = getFormData();
  document.getElementById('doc-pihakkedua-sign').innerText = formData.pihakKedua || 'Nama Anggota';
  
  // Format text into clean paragraphs & headings HTML
  let cleanText = currentDraftText;
  
  // Clean any markdown formatting (* and **)
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/---/g, '');

  const lines = cleanText.split('\n');
  let formattedHtml = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Judul Utama & Sub-Judul
    if (trimmed.startsWith('AKAD ') || trimmed.startsWith('PERJANJIAN ') || trimmed.startsWith('BISMILLAH') || trimmed.includes('بسم الله')) {
      formattedHtml += `<h3 style="text-align:center; font-size: 1.2rem; font-weight: bold; margin: 1rem 0 0.5rem 0; text-transform: uppercase;">${trimmed}</h3>`;
    } else if (trimmed.startsWith('No.') || trimmed.startsWith('NO.')) {
      formattedHtml += `<p style="text-align:center; font-weight: bold; margin-bottom: 1.5rem;">${trimmed}</p>`;
    } else if (trimmed.startsWith('PASAL') || trimmed.startsWith('Pasal')) {
      formattedHtml += `<h4 style="text-align:center; font-size: 1.1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase;">${trimmed}</h4>`;
    } else if (trimmed.startsWith('Ayat ') || trimmed.startsWith('AYAT ')) {
      formattedHtml += `<h5 style="font-weight: bold; margin-top: 0.75rem; margin-bottom: 0.25rem;">${trimmed}</h5>`;
    } else if (trimmed.match(/^[\u0600-\u06FF]/)) { // Teks Bahasa Arab (Al-Qur'an / Hadits)
      formattedHtml += `<p style="text-align:center; font-size: 1.3rem; font-family: 'Amiri', 'Traditional Arabic', serif; margin: 1rem 0; direction: rtl; line-height: 2;">${trimmed}</p>`;
    } else if (trimmed.startsWith('"Hai orang-orang') || trimmed.startsWith('Dari Abu Sa\'id') || trimmed.startsWith('(Qs.') || trimmed.startsWith('(HR.')) {
      formattedHtml += `<p style="text-align:center; font-style: italic; font-size: 0.95rem; margin-bottom: 1rem; color: #334155; padding: 0 1rem;">${trimmed}</p>`;
    } else {
      formattedHtml += `<p style="margin-bottom: 0.75rem; text-align: justify; text-justify: inter-word; text-indent: 2rem; line-height: 1.7;">${trimmed}</p>`;
    }
  });

  document.getElementById('document-content-area').innerHTML = formattedHtml;
  switchTab('document');
}

// Approve Document
function approveContract() {
  document.getElementById('approval-stamp').innerHTML = "✅ DISAHKAN KOPERASI";
  document.getElementById('approval-stamp').style.borderColor = "var(--success)";
  document.getElementById('approval-stamp').style.color = "var(--success)";
  
  if (createdContracts.length > 0) {
    createdContracts[0].status = 'APPROVED';
    addAuditLog(`Contract Approved: ${createdContracts[0].id} oleh Pengurus Koperasi`);
    updateDashboardStats();
  }
  
  alert("Dokumen Akad Syariah berhasil disahkan, diberi stempel legalitas Koperasi, dan dicatat ke Audit Log!");
}

// Dashboard Update
function updateDashboardStats() {
  document.getElementById('stat-total-akad').innerText = createdContracts.length;
  
  if (createdContracts.length > 0) {
    const avgScore = (createdContracts.reduce((acc, curr) => acc + curr.score, 0) / createdContracts.length).toFixed(1);
    document.getElementById('stat-syariah-score').innerText = `${avgScore}%`;
  } else {
    document.getElementById('stat-syariah-score').innerText = `-`;
  }

  // Render Dashboard Table
  const tbody = document.getElementById('dashboard-table-body');
  if (createdContracts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Belum ada akad yang dibuat. Klik tombol di samping untuk membuat akad baru.
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = createdContracts.map(c => `
      <tr>
        <td><strong>${c.type} (${c.id})</strong></td>
        <td>${c.pihakKedua}</td>
        <td><span class="badge badge-success">${c.score}% Patuh (${c.status})</span></td>
      </tr>
    `).join('');
  }

  // Render Verification Table
  const vbody = document.getElementById('verification-table-body');
  if (createdContracts.length === 0) {
    vbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Belum ada akad aktif yang dibuat.
        </td>
      </tr>`;
  } else {
    vbody.innerHTML = createdContracts.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.type}</td>
        <td>${c.pihakKedua}</td>
        <td>${c.date}</td>
        <td><span class="badge badge-success">${c.score}% Valid</span></td>
        <td>
          <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="viewContractById('${c.id}')">Review & Approve</button>
        </td>
      </tr>
    `).join('');
  }
}

function viewContractById(id) {
  const contract = createdContracts.find(c => c.id === id);
  if (contract) {
    currentDraftText = contract.content;
    viewGeneratedDocument();
  }
}

function addAuditLog(message) {
  const container = document.getElementById('audit-log-container');
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  container.innerHTML += `<p>[${timestamp}] ${message}</p>`;
}
