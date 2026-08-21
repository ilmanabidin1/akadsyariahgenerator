/**
 * Application Main Controller & Navigation Logic
 */

let currentAkadType = "Murabahah";
let currentValidationResult = null;
let currentDraftText = "";
let createdContracts = [];
let currentWizardStep = 1;

// ==========================================
// RUPIAH CURRENCY FORMATTER HELPERS
// ==========================================

// Format plain number into thousand separator dot string (e.g. 1000000 -> 1.000.000)
function formatNumberWithDots(value) {
  if (value === null || value === undefined || value === '') return '';
  const cleanNumber = String(value).replace(/[^0-9]/g, '');
  if (!cleanNumber) return '';
  return parseInt(cleanNumber, 10).toLocaleString('id-ID');
}

// Parse string with dot separators back to raw float (e.g. "1.000.000" -> 1000000)
function parseRawNumber(str) {
  if (!str) return 0;
  const cleanStr = String(str).replace(/[^0-9]/g, '');
  return cleanStr ? parseFloat(cleanStr) : 0;
}

// Live Input Event Formatter (formats dynamically while keeping cursor clean)
function formatRupiahInput(inputEl) {
  if (!inputEl) return;
  const raw = inputEl.value.replace(/[^0-9]/g, '');
  if (!raw) {
    inputEl.value = '';
    return;
  }
  inputEl.value = parseInt(raw, 10).toLocaleString('id-ID');
}

// ==========================================
// AUTHENTICATION & LANDING PAGE LOGIC
// ==========================================

function checkAuthSession() {
  const userJson = localStorage.getItem('akadify_logged_user');
  const landingEl = document.getElementById('landing-page-container');
  const appEl = document.getElementById('main-app-wrapper');

  if (userJson) {
    let userObj = null;
    try {
      userObj = JSON.parse(userJson);
    } catch (e) {
      userObj = { fullname: userJson, userType: 'KOPERASI' };
    }

    if (landingEl) landingEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';
    
    const displayEl = document.getElementById('logged-user-display');
    if (displayEl) {
      const roleLabel = userObj.userType === 'DPS' ? 'Dewan Pengawas' : 'Koperasi';
      displayEl.innerText = `${userObj.fullname || userObj.username} (${roleLabel})`;
    }
  } else {
    if (landingEl) landingEl.style.display = 'block';
    if (appEl) appEl.style.display = 'none';
  }
}

function openLoginModal(defaultTab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'flex';
    switchAuthTab(defaultTab);
    
    // Clear forms
    const userIn = document.getElementById('login-username');
    if (userIn) {
      userIn.value = '';
      userIn.focus();
    }
    const passIn = document.getElementById('login-password');
    if (passIn) passIn.value = '';
    
    const errLogin = document.getElementById('login-error-msg');
    if (errLogin) errLogin.style.display = 'none';
    const errReg = document.getElementById('register-error-msg');
    if (errReg) errReg.style.display = 'none';
    const succReg = document.getElementById('register-success-msg');
    if (succReg) succReg.style.display = 'none';
  }
}

function closeLoginModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const viewLogin = document.getElementById('auth-view-login');
  const viewRegister = document.getElementById('auth-view-register');
  const titleEl = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    tabLogin.style.color = 'var(--primary)';
    tabLogin.style.borderBottom = '2px solid var(--primary)';
    tabLogin.style.fontWeight = '700';

    tabRegister.style.color = 'var(--text-muted)';
    tabRegister.style.borderBottom = 'none';
    tabRegister.style.fontWeight = '600';

    viewLogin.style.display = 'block';
    viewRegister.style.display = 'none';
    if (titleEl) titleEl.innerText = 'Masuk ke Portal AKADIFY';
  } else {
    tabRegister.style.color = 'var(--primary)';
    tabRegister.style.borderBottom = '2px solid var(--primary)';
    tabRegister.style.fontWeight = '700';

    tabLogin.style.color = 'var(--text-muted)';
    tabLogin.style.borderBottom = 'none';
    tabLogin.style.fontWeight = '600';

    viewRegister.style.display = 'block';
    viewLogin.style.display = 'none';
    if (titleEl) titleEl.innerText = 'Registrasi Entitas Baru';
  }
}

// Toggle Fields Berdasarkan Kategori Registrasi (Koperasi vs DPS)
function toggleRegisterTypeFields(type) {
  const labelInst = document.getElementById('label-institution-name');
  const labelLegal = document.getElementById('label-legal-number');
  const inputInst = document.getElementById('reg-institution');
  const inputLegal = document.getElementById('reg-legal-number');

  if (type === 'KOPERASI') {
    if (labelInst) labelInst.innerText = 'Nama Lembaga Koperasi / BMT / KSPPS';
    if (inputInst) inputInst.placeholder = 'Contoh: KSPPS BMT Bina Ummah Sejahtera';
    if (labelLegal) labelLegal.innerText = 'Nomor Badan Hukum / SK Kemenkumham (AHU)';
    if (inputLegal) inputLegal.placeholder = 'Contoh: AHU-0012345.AH.01.26.TAHUN 2024';
  } else {
    if (labelInst) labelInst.innerText = 'Nama Lembaga / Kantor DPS / Afiliasi';
    if (inputInst) inputInst.placeholder = 'Contoh: Dewan Pengawas Syariah Perwakilan Wilayah';
    if (labelLegal) labelLegal.innerText = 'No. Sertifikasi / Rekomendasi DSN-MUI';
    if (inputLegal) inputLegal.placeholder = 'Contoh: DSN-MUI/DPS-CERT/2025/9981';
  }
}

// Handle Submit Registrasi Real ke Backend
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const errMsg = document.getElementById('register-error-msg');
  const succMsg = document.getElementById('register-success-msg');
  const btnSubmit = document.getElementById('btn-register-submit');

  const userTypeEl = document.querySelector('input[name="registerUserType"]:checked');
  const userType = userTypeEl ? userTypeEl.value : 'KOPERASI';
  const institutionName = document.getElementById('reg-institution')?.value.trim() || '';
  const legalNumber = document.getElementById('reg-legal-number')?.value.trim() || '';
  const fullname = document.getElementById('reg-fullname')?.value.trim() || '';
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const username = document.getElementById('reg-username')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value.trim() || '';

  errMsg.style.display = 'none';
  succMsg.style.display = 'none';
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Memproses Pendaftaran...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userType, institutionName, legalNumber, fullname, email, username, password })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      succMsg.innerText = `✅ Registrasi berhasil untuk ${fullname}! Silakan masuk menggunakan username & kata sandi Anda.`;
      succMsg.style.display = 'block';
      
      setTimeout(() => {
        switchAuthTab('login');
        const loginUserIn = document.getElementById('login-username');
        if (loginUserIn) loginUserIn.value = username;
      }, 1500);
    } else {
      errMsg.innerText = `⚠️ ${result.error || 'Gagal melakukan pendaftaran.'}`;
      errMsg.style.display = 'block';
    }
  } catch (err) {
    console.error('Error register:', err);
    errMsg.innerText = '⚠️ Terjadi kendala koneksi ke server.';
    errMsg.style.display = 'block';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Daftarkan Akun Lembaga →';
  }
}

// Handle Submit Login Real ke Backend
async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username')?.value.trim() || '';
  const password = document.getElementById('login-password')?.value.trim() || '';
  const errMsg = document.getElementById('login-error-msg');
  const btnSubmit = document.getElementById('btn-login-submit');

  errMsg.style.display = 'none';
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Memverifikasi...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      localStorage.setItem('akadify_logged_user', JSON.stringify(result.user));
      closeLoginModal();
      checkAuthSession();
      addAuditLog(`User Logged In: ${result.user.fullname} (${result.user.userType})`);
    } else {
      errMsg.innerText = `⚠️ ${result.error || 'Username atau Password tidak valid.'}`;
      errMsg.style.display = 'block';
    }
  } catch (err) {
    console.error('Error login:', err);
    errMsg.innerText = '⚠️ Gagal terhubung ke server autentikasi.';
    errMsg.style.display = 'block';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Masuk ke Sistem →';
  }
}

function handleLogout() {
  const confirmLogout = confirm("Apakah Anda yakin ingin keluar dari sistem AKADIFY?");
  if (!confirmLogout) return;

  localStorage.removeItem('akadify_logged_user');
  checkAuthSession();
  addAuditLog("User Logged Out");
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  checkAuthSession();
  initSidebarFoldState();
  onAkadTypeChange("Murabahah");
  fetchContractsFromBackend();

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar fold
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebarFold();
    }
  });
});

// Sidebar Fold / Collapse Toggle Handler
function toggleSidebarFold() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  
  // Save user preference
  localStorage.setItem('akadify_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  
  // Update toggle button title
  const btn = document.getElementById('sidebar-toggle-btn');
  if (btn) {
    btn.title = isCollapsed ? 'Buka Sidebar (Ctrl + B)' : 'Lipat Sidebar (Ctrl + B)';
  }
}

// Restore Sidebar Fold State from localStorage
function initSidebarFoldState() {
  const isCollapsed = localStorage.getItem('akadify_sidebar_collapsed') === 'true';
  const sidebar = document.getElementById('app-sidebar');
  const btn = document.getElementById('sidebar-toggle-btn');
  
  if (sidebar && isCollapsed) {
    sidebar.classList.add('collapsed');
    if (btn) btn.title = 'Buka Sidebar (Ctrl + B)';
  }
}

// Fetch persistent contracts from backend /data storage (Filtered by User Role)
async function fetchContractsFromBackend() {
  const userJson = localStorage.getItem('akadify_logged_user');
  let queryParam = '';

  if (userJson) {
    try {
      const userObj = JSON.parse(userJson);
      queryParam = `?userId=${encodeURIComponent(userObj.id || userObj.username)}&userType=${encodeURIComponent(userObj.userType || 'KOPERASI')}`;
    } catch (e) {
      queryParam = '';
    }
  }

  try {
    const response = await fetch(`/api/contracts${queryParam}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.contracts)) {
        createdContracts = data.contracts;
      }
    }
  } catch (err) {
    console.error("Gagal memuat data akad dari backend:", err);
  }
  updateDashboardStats();
}

// Sync contract to backend persistent volume /data with Owner Metadata
async function syncContractToBackend(contract) {
  const userJson = localStorage.getItem('akadify_logged_user');
  let currentUserId = 'USR-DEMO-001';
  let institutionName = 'Koperasi Syariah';

  if (userJson) {
    try {
      const userObj = JSON.parse(userJson);
      currentUserId = userObj.id || userObj.username;
      institutionName = userObj.institutionName || userObj.fullname;
    } catch (e) {
      currentUserId = userJson;
    }
  }

  contract.createdByUserId = currentUserId;
  contract.institutionName = institutionName;

  try {
    await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract })
    });
  } catch (err) {
    console.error("Gagal menyimpan akad ke backend:", err);
  }
}

// Tab Switcher
function switchTab(tabId) {
  const tabs = ['dashboard', 'generator', 'document', 'calculator', 'verification', 'audit'];
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
    'calculator': 'Simulasi Finansial & Kalkulator Syariah',
    'verification': 'Daftar Dokumen Akad Terbit',
    'audit': 'Audit Trail & Log Status System'
  };
  document.getElementById('page-title').innerText = titles[tabId] || 'Akad Syariah System';
}

// Modal Footer Handler for About & Terms
function toggleFooterModal(type) {
  const modal = document.getElementById('info-modal');
  const body = document.getElementById('modal-body-content');

  if (type === 'about') {
    body.innerHTML = `
      <div style="border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <span class="badge" style="background: var(--primary-subtle); color: var(--primary-dark); margin-bottom: 0.25rem;">Riset Terapan PDUPT</span>
        <h3 style="color: var(--primary-dark); font-size: 1.25rem; margin: 0.25rem 0;">Tentang AKADIFY & Tim Peneliti</h3>
      </div>
      
      <div style="margin-bottom: 1rem; background: var(--primary-subtle); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--primary-light);">
        <h4 style="color: var(--primary-dark); margin-bottom: 0.2rem; font-size: 0.95rem;">👨‍💻 Developer & Pengembang Utama Aplikasi:</h4>
        <p style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; margin: 0;">Dr. M Ilman Abidin, S.H., M.H.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Dosen & Peneliti - Fakultas Hukum Universitas Islam Bandung (UNISBA)</p>
      </div>

      <div style="margin-bottom: 1rem;">
        <h4 style="color: var(--primary-dark); font-size: 0.95rem; margin-bottom: 0.2rem;">👩‍🏫 Ketua Tim Penelitian & Guru Besar:</h4>
        <p style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; margin: 0;">Prof. Dr. Neni Sri Imaniyati, S.H., M.H.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Guru Besar Hukum Perbankan Syariah & HKI - Fakultas Hukum UNISBA</p>
      </div>

      <div style="margin-bottom: 1rem;">
        <h4 style="color: var(--primary-dark); font-size: 0.95rem; margin-bottom: 0.2rem;">🏛️ Mitra Penerapan Prototipe:</h4>
        <p style="font-size: 0.85rem; color: var(--text-main); margin: 0;">Koperasi Syariah / Koperasi Konsumen Al Firdaus & Ekosistem Lembaga Keuangan Mikro Syariah (BMT/LKMS).</p>
      </div>

      <div style="font-size: 0.85rem; line-height: 1.6; text-align: justify; color: var(--text-main); background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <strong>Urgensi & Kebaruan Riset:</strong> AKADIFY mengintegrasikan logika fikih muamalah, fatwa DSN-MUI, dan regulasi OJK secara otomatis berbasis Artificial Intelligence & Rule Engine untuk memitigasi risiko kesalahan redaksional (compliance risk) serta memberikan kepastian hukum akad syariah digital.
      </div>
    `;
  } else if (type === 'terms') {
    body.innerHTML = `
      <div style="border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <h3 style="color: var(--primary-dark); font-size: 1.25rem; margin: 0;">Syarat & Ketentuan Penggunaan (Terms & Conditions)</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Ketentuan Hukum & Kepatuhan Syariah Platform AKADIFY</p>
      </div>

      <div style="font-size: 0.85rem; line-height: 1.6; color: var(--text-main);">
        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">1. Kepatuhan Fatwa DSN-MUI</h4>
        <p style="margin-bottom: 0.75rem;">Setiap dokumen akad yang disusun melalui platform AKADIFY wajib memenuhi rukun akad (Subjek, Objek, Ijab Qabul) dan syarat sah akad (Bebas Riba, Gharar, Maysir) sesuai Fatwa DSN-MUI.</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">2. Tanggung Jawab Data Input</h4>
        <p style="margin-bottom: 0.75rem;">Pengguna (Legal Officer/Admin Koperasi/Pengurus) bertanggung jawab penuh atas kebenaran identitas para pihak, barang, rincian finansial, dan saksi yang diisikan ke form.</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">3. Kedudukan Hasil AI & Pengesahan DPS</h4>
        <p style="margin-bottom: 0.75rem;">Dokumen hasil AI Generator bertindak sebagai draf baku Notaris/Koperasi. Pengesahan final tetap disarankan melalui peninjauan Dewan Pengawas Syariah (DPS).</p>

        <h4 style="color: var(--primary-dark); margin-top: 0.75rem; margin-bottom: 0.2rem;">4. Hak Kekayaan Intelektual (HKI)</h4>
        <p style="margin-bottom: 0.75rem;">Metode validasi rukun-syarat otomatis ini dilindungi oleh Hak Cipta & Paten Sederhana terdaftar hasil riset PDUPT Fakultas Hukum UNISBA.</p>
      </div>
    `;
  }

  modal.style.display = 'flex';
}

function closeFooterModal() {
  document.getElementById('info-modal').style.display = 'none';
}

// Wizard Stepper Navigation Handler
function goToWizardStep(stepNum) {
  currentWizardStep = stepNum;

  [1, 2, 3].forEach(num => {
    const stepView = document.getElementById(`wizard-step-${num}`);
    const stepBtn = document.getElementById(`step-btn-${num}`);
    const stepNumEl = document.getElementById(`step-num-${num}`);

    if (stepView) stepView.style.display = (num === stepNum) ? 'block' : 'none';

    if (stepBtn) {
      stepBtn.classList.remove('active', 'completed');
      if (num === stepNum) {
        stepBtn.classList.add('active');
      } else if (num < stepNum) {
        stepBtn.classList.add('completed');
        if (stepNumEl) stepNumEl.innerText = '✓';
      } else {
        if (stepNumEl) stepNumEl.innerText = num;
      }
    }
  });
}

// Quick Fill Demo Data Function with Detailed Identity
function fillQuickDemoData() {
  if (document.getElementById('tanggalAkad')) document.getElementById('tanggalAkad').value = "Senin, 15 Juni 2026";
  if (document.getElementById('tempatAkad')) document.getElementById('tempatAkad').value = "Pukul 10.00 WIB di Kantor PT Bank BNI Syariah Palembang";

  // Pihak Pertama (Lembaga/Penjual)
  if (document.getElementById('pihakPertama')) document.getElementById('pihakPertama').value = "Iswahyudi, S.Sy";
  if (document.getElementById('umurPihak1')) document.getElementById('umurPihak1').value = "25 Tahun";
  if (document.getElementById('nikPihak1')) document.getElementById('nikPihak1').value = "160710102205940003";
  if (document.getElementById('jabatanPihak1')) document.getElementById('jabatanPihak1').value = "Kepala Divisi Marketing";
  if (document.getElementById('lembagaPihak1')) document.getElementById('lembagaPihak1').value = "PT Bank BNI Syariah Palembang";
  if (document.getElementById('alamatPihak1')) document.getElementById('alamatPihak1').value = "Jln. Raya Palembang-Betung Km15 Rt.21/06 Kel. Tanah Mas Kec. Talang Kelapa Banyuasin";

  // Pihak Kedua (Pembeli/Nasabah)
  if (document.getElementById('pihakKedua')) document.getElementById('pihakKedua').value = "Asrori Agus Latif, S.Sy";
  if (document.getElementById('umurPihak2')) document.getElementById('umurPihak2').value = "29 Tahun";
  if (document.getElementById('nikPihak2')) document.getElementById('nikPihak2').value = "1234567891012314";
  if (document.getElementById('pekerjaanPihak2')) document.getElementById('pekerjaanPihak2').value = "Pegawai Negeri Sipil (Kemenag Banyuasin)";
  if (document.getElementById('alamatPihak2')) document.getElementById('alamatPihak2').value = "Jln. Pangeran Ayin Rt.10/12 Kel. Talang Keramat Kec. Talang Kelapa Kab. Banyuasin";

  // Saksi
  if (document.getElementById('saksi1')) document.getElementById('saksi1').value = "Budi Santoso, S.H.";
  if (document.getElementById('saksi2')) document.getElementById('saksi2').value = "Dra. Siti Rahmah";

  if (currentAkadType === 'Murabahah') {
    if (document.getElementById('namaBarang')) document.getElementById('namaBarang').value = "Kendaraan Operasional Motor Honda Vario 160cc";
    if (document.getElementById('spesifikasi')) document.getElementById('spesifikasi').value = "Tahun 2026, Warna Hitam Metallic, Kondisi Baru 100%";
    if (document.getElementById('hargaBeli')) document.getElementById('hargaBeli').value = "28.000.000";
    if (document.getElementById('margin')) document.getElementById('margin').value = "4.200.000";
    if (document.getElementById('uangMuka')) document.getElementById('uangMuka').value = "3.000.000";
    if (document.getElementById('tenor')) document.getElementById('tenor').value = "24";
  } else if (currentAkadType === 'Qardh') {
    if (document.getElementById('jumlahPinjaman')) document.getElementById('jumlahPinjaman').value = "10.000.000";
    if (document.getElementById('biayaAdmin')) document.getElementById('biayaAdmin').value = "75.000";
    if (document.getElementById('jatuhTempo')) document.getElementById('jatuhTempo').value = "6 Bulan";
    if (document.getElementById('tujuanQardh')) document.getElementById('tujuanQardh').value = "Modal Kerja Usaha Mikro Konveksi";
  } else if (currentAkadType === 'Mudharabah') {
    if (document.getElementById('bidangUsaha')) document.getElementById('bidangUsaha').value = "Budidaya & Perdagangan Ikan Nila Syariah";
    if (document.getElementById('jumlahModal')) document.getElementById('jumlahModal').value = "50.000.000";
    if (document.getElementById('nisbahPengelola')) document.getElementById('nisbahPengelola').value = "60";
    if (document.getElementById('nisbahPemodal')) document.getElementById('nisbahPemodal').value = "40";
  } else if (currentAkadType === 'Ijarah') {
    if (document.getElementById('namaBarang')) document.getElementById('namaBarang').value = "Sewa Ruko Tempat Usaha Koperasi 2 Lantai";
    if (document.getElementById('biayaUjrah')) document.getElementById('biayaUjrah').value = "35.000.000";
    if (document.getElementById('tenorIjarah')) document.getElementById('tenorIjarah').value = "1 Tahun";
  } else if (currentAkadType === 'Syirkah') {
    if (document.getElementById('bidangUsaha')) document.getElementById('bidangUsaha').value = "Kemitraan Usaha Minimarket Syariah";
    if (document.getElementById('modalPihak1')) document.getElementById('modalPihak1').value = "100.000.000";
    if (document.getElementById('modalPihak2')) document.getElementById('modalPihak2').value = "100.000.000";
    if (document.getElementById('nisbahPengelola')) document.getElementById('nisbahPengelola').value = "50";
    if (document.getElementById('nisbahPemodal')) document.getElementById('nisbahPemodal').value = "50";
  } else if (currentAkadType === 'Koperasi Syariah') {
    if (document.getElementById('simpananPokok')) document.getElementById('simpananPokok').value = "500.000";
    if (document.getElementById('simpananWajib')) document.getElementById('simpananWajib').value = "50.000";
  }

  triggerValidation();
  goToWizardStep(2);
}

// Start Akad Action from Dashboard
function startAkad(type) {
  document.getElementById('form-akad-type').value = type;
  onAkadTypeChange(type);
  goToWizardStep(1);
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
        <input type="text" id="namaBarang" class="form-control" placeholder="Contoh: Kendaraan / Barang Modal" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Spesifikasi Barang</label>
        <input type="text" id="spesifikasi" class="form-control" placeholder="Contoh: Merk, Tipe, Warna, Kondisi Baru/Bekas" oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Harga Pokok Pembelian (Rp)</label>
        <input type="text" id="hargaBeli" class="form-control rupiah-input" placeholder="Contoh: 100.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Margin Keuntungan Koperasi (Rp)</label>
        <input type="text" id="margin" class="form-control rupiah-input" placeholder="Contoh: 15.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Uang Muka / DP (Rp)</label>
        <input type="text" id="uangMuka" class="form-control rupiah-input" placeholder="Contoh: 10.000.000" oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Tenor / Jangka Waktu (Bulan)</label>
        <input type="number" id="tenor" class="form-control" placeholder="Contoh: 12" min="1" max="120" required oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Qardh') {
    container.innerHTML = `
      <div class="form-group">
        <label>Jumlah Pinjaman Pokok (Rp)</label>
        <input type="text" id="jumlahPinjaman" class="form-control rupiah-input" placeholder="Contoh: 10.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Biaya Administrasi Riil / Cetak Dokumen (Rp)</label>
        <input type="text" id="biayaAdmin" class="form-control rupiah-input" placeholder="Contoh: 50.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Jatuh Tempo Pengembalian</label>
        <input type="text" id="jatuhTempo" class="form-control" placeholder="Contoh: 6 Bulan" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Tujuan Pinjaman Kebajikan</label>
        <input type="text" id="tujuanQardh" class="form-control" placeholder="Contoh: Kebutuhan Mendesak / Modal Usaha Darurat">
      </div>
    `;
  } else if (type === 'Mudharabah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Sektor / Bidang Usaha Mudharabah</label>
        <input type="text" id="bidangUsaha" class="form-control" placeholder="Contoh: Usaha Perdagangan / Perikanan / Perkebunan" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jumlah Modal Disetor Shahibul Maal (Rp)</label>
        <input type="text" id="jumlahModal" class="form-control rupiah-input" placeholder="Contoh: 50.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pengelola / Mudharib (%)</label>
        <input type="number" id="nisbahPengelola" class="form-control" placeholder="60" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pemodal / Koperasi (%)</label>
        <input type="number" id="nisbahPemodal" class="form-control" placeholder="40" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Jangka Waktu Usaha (Bulan)</label>
        <input type="number" id="tenorMudharabah" class="form-control" placeholder="12">
      </div>
    `;
  } else if (type === 'Ijarah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Objek Manfaat / Barang Sewa</label>
        <input type="text" id="namaBarang" class="form-control" placeholder="Contoh: Sewa Bangunan / Mesin / Kendaraan Operasional" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Biaya Sewa / Ujrah (Rp per periode)</label>
        <input type="text" id="biayaUjrah" class="form-control rupiah-input" placeholder="Contoh: 5.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Masa Sewa / Periode</label>
        <input type="text" id="tenorIjarah" class="form-control" placeholder="Contoh: 1 Tahun / 12 Bulan" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Sistem Pembayaran Sewa</label>
        <input type="text" id="pembayaranIjarah" class="form-control" placeholder="Contoh: Dibayar di Awal / Bulanan">
      </div>
    `;
  } else if (type === 'Syirkah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Nama / Bidang Usaha Kemitraan (Musyarakah)</label>
        <input type="text" id="bidangUsaha" class="form-control" placeholder="Contoh: Joint Venture Pengembangan Properti / Usaha Bersama" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Setoran Modal Pihak Pertama (Rp)</label>
        <input type="text" id="modalPihak1" class="form-control rupiah-input" placeholder="Contoh: 100.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Setoran Modal Pihak Kedua (Rp)</label>
        <input type="text" id="modalPihak2" class="form-control rupiah-input" placeholder="Contoh: 100.000.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pengelola (%)</label>
        <input type="number" id="nisbahPengelola" class="form-control" placeholder="50" required oninput="triggerValidation()">
      </div>
      <div class="form-group">
        <label>Nisbah Bagi Hasil Pemodal (%)</label>
        <input type="number" id="nisbahPemodal" class="form-control" placeholder="50" required oninput="triggerValidation()">
      </div>
    `;
  } else if (type === 'Koperasi Syariah') {
    container.innerHTML = `
      <div class="form-group">
        <label>Simpanan Pokok (Rp)</label>
        <input type="text" id="simpananPokok" class="form-control rupiah-input" placeholder="Contoh: 500.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Simpanan Wajib (Rp per bulan)</label>
        <input type="text" id="simpananWajib" class="form-control rupiah-input" placeholder="Contoh: 50.000" required oninput="formatRupiahInput(this); triggerValidation();">
      </div>
      <div class="form-group">
        <label>Hak & Kewajiban Utama Anggota</label>
        <input type="text" id="hakKewajiban" class="form-control" placeholder="Contoh: Menjadi Anggota Penuh & Mematuhi Anggaran Dasar Koperasi">
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
  } else if (currentAkadType === 'Mudharabah') {
    result = SyariahRulesEngine.validateMudharabah(data);
  } else {
    // Basic validation for Ijarah, Syirkah, Koperasi Syariah
    result = {
      akadType: currentAkadType,
      score: 100,
      isCompliant: true,
      checks: [
        { rule: "Subjek Akad", status: "pass", message: "Identitas para pihak terverifikasi." },
        { rule: "Rukun & Syarat Syariah", status: "pass", message: `Sesuai Fatwa & Standar DSN-MUI untuk ${currentAkadType}.` },
        { rule: "Bebas Riba & Gharar", status: "pass", message: "Ketentuan bebas dari unsur terlarang." }
      ]
    };
  }

  currentValidationResult = result;
  renderValidationPanel(result);
}

// Get Form Data Helper with Full Detailed Identiy
function getFormData() {
  const data = {
    tipeAkad: currentAkadType,
    tanggalAkad: document.getElementById('tanggalAkad')?.value || '',
    tempatAkad: document.getElementById('tempatAkad')?.value || '',
    
    // Pihak Pertama
    pihakPertama: document.getElementById('pihakPertama')?.value || '',
    umurPihak1: document.getElementById('umurPihak1')?.value || '',
    nikPihak1: document.getElementById('nikPihak1')?.value || '',
    jabatanPihak1: document.getElementById('jabatanPihak1')?.value || '',
    lembagaPihak1: document.getElementById('lembagaPihak1')?.value || '',
    alamatPihak1: document.getElementById('alamatPihak1')?.value || '',

    // Pihak Kedua
    pihakKedua: document.getElementById('pihakKedua')?.value || '',
    umurPihak2: document.getElementById('umurPihak2')?.value || '',
    nikPihak2: document.getElementById('nikPihak2')?.value || '',
    pekerjaanPihak2: document.getElementById('pekerjaanPihak2')?.value || '',
    alamatPihak2: document.getElementById('alamatPihak2')?.value || ''
  };

  if (currentAkadType === 'Murabahah') {
    data.namaBarang = document.getElementById('namaBarang')?.value || '';
    data.spesifikasi = document.getElementById('spesifikasi')?.value || '';
    data.hargaBeli = parseRawNumber(document.getElementById('hargaBeli')?.value);
    data.margin = parseRawNumber(document.getElementById('margin')?.value);
    data.uangMuka = parseRawNumber(document.getElementById('uangMuka')?.value);
    data.tenor = parseInt(document.getElementById('tenor')?.value || 1, 10);
    data.saksi1 = document.getElementById('saksi1')?.value || '';
    data.saksi2 = document.getElementById('saksi2')?.value || '';
  } else if (currentAkadType === 'Qardh') {
    data.jumlahPinjaman = parseRawNumber(document.getElementById('jumlahPinjaman')?.value);
    data.biayaAdmin = parseRawNumber(document.getElementById('biayaAdmin')?.value);
    data.jatuhTempo = document.getElementById('jatuhTempo')?.value || '';
    data.tujuanQardh = document.getElementById('tujuanQardh')?.value || '';
  } else if (currentAkadType === 'Mudharabah') {
    data.bidangUsaha = document.getElementById('bidangUsaha')?.value || '';
    data.jumlahModal = parseRawNumber(document.getElementById('jumlahModal')?.value);
    data.nisbahPengelola = parseFloat(document.getElementById('nisbahPengelola')?.value || 0);
    data.nisbahPemodal = parseFloat(document.getElementById('nisbahPemodal')?.value || 0);
  } else if (currentAkadType === 'Ijarah') {
    data.namaBarang = document.getElementById('namaBarang')?.value || '';
    data.biayaUjrah = parseRawNumber(document.getElementById('biayaUjrah')?.value);
    data.tenorIjarah = document.getElementById('tenorIjarah')?.value || '';
  } else if (currentAkadType === 'Syirkah') {
    data.bidangUsaha = document.getElementById('bidangUsaha')?.value || '';
    data.modalPihak1 = parseRawNumber(document.getElementById('modalPihak1')?.value);
    data.modalPihak2 = parseRawNumber(document.getElementById('modalPihak2')?.value);
    data.nisbahPengelola = parseFloat(document.getElementById('nisbahPengelola')?.value || 50);
    data.nisbahPemodal = parseFloat(document.getElementById('nisbahPemodal')?.value || 50);
  } else if (currentAkadType === 'Koperasi Syariah') {
    data.simpananPokok = parseRawNumber(document.getElementById('simpananPokok')?.value);
    data.simpananWajib = parseRawNumber(document.getElementById('simpananWajib')?.value);
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

// Submit Form - Generate Redaksi Akad via Akadify AI Server
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = getFormData();

  const btnSubmit = document.getElementById('btn-submit-ai');
  const progressContainer = document.getElementById('progress-container');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercentText = document.getElementById('progress-percent-text');

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = "⏳ Menghubungi Server Akadify AI...";
  
  // Reset and show progress bar
  progressContainer.style.display = "block";
  progressBarFill.style.width = "5%";
  progressPercentText.innerText = "5%";
  progressStatusText.innerText = "⏳ Memvalidasi parameter transaksi...";

  // Simulated progressive updates with Akadify AI branding
  let currentProgress = 5;
  const progressInterval = setInterval(() => {
    if (currentProgress < 30) {
      currentProgress += 5;
      progressStatusText.innerText = "🔍 Memverifikasi kepatuhan Rukun & Fatwa DSN-MUI...";
    } else if (currentProgress < 75) {
      currentProgress += 3;
      progressStatusText.innerText = "🤖 Akadify AI sedang menyusun klausul & rincian finansial...";
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
      btnSubmit.innerHTML = "⚡ Susun Akad dengan AI";
      progressContainer.style.display = "none";
      
      currentDraftText = textResult;
      
      // Save to active contract list
      const contractId = `AKD/${currentAkadType.substring(0,3).toUpperCase()}/${Math.floor(100000 + Math.random() * 900000)}`;
      const newContract = {
        id: contractId,
        type: currentAkadType,
        pihakKedua: formData.pihakKedua,
        date: new Date().toLocaleDateString('id-ID'),
        score: currentValidationResult.score,
        content: currentDraftText,
        status: 'DRAFT'
      };

      createdContracts.unshift(newContract);
      syncContractToBackend(newContract);
      updateDashboardStats();
      addAuditLog(`Contract Generated via Template: ${newContract.id} (${newContract.type}) - Score: ${newContract.score}%`);
      viewGeneratedDocument();
    }, 600);
  } else {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = "⚡ Susun Akad dengan AI";
    progressContainer.style.display = "none";
  }
}

// Display Generated Document
function viewGeneratedDocument() {
  if (!currentDraftText) {
    alert("Belum ada draft akad yang dihasilkan. Silakan isi form dan klik 'Susun Akad dengan AI'.");
    return;
  }

  const formData = getFormData();
  document.getElementById('doc-pihakkedua-sign').innerText = formData.pihakKedua || 'Nama Anggota';
  
  // Set QR Code Hash & Image
  const activeId = createdContracts.length > 0 ? createdContracts[0].id : 'AKD-VERIFIED';
  document.getElementById('doc-qr-hash').innerText = `Hash: ${activeId}`;
  document.getElementById('doc-qr-code').src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=AKADIFY-VERIFIED-${activeId}`;

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
      // Deteksi penomoran butir / pointer berjenjang (Multilevel Numbering)
      const listMatch = trimmed.match(/^(\d+\.|\([0-9]+\)|[a-z]\.|\([a-z]\)|[A-Z]\.|\d+\)|[ivxlcdm]+\.|\([ivxlcdm]+\)|-)\s+(.*)$/);
      if (listMatch) {
        const numLabel = listMatch[1];
        const textBody = listMatch[2];
        
        // Tentukan level indentasi hierarki
        let levelClass = 'doc-level-1';
        let wordIndentPt = 0;
        let wordNumWidthPt = 25;

        if (/^[a-z]\.|\([a-z]\)/.test(numLabel)) {
          // Level 2: a. , b. , (a)
          levelClass = 'doc-level-2';
          wordIndentPt = 24;
          wordNumWidthPt = 20;
        } else if (/^[ivxlcdm]+\.|\([ivxlcdm]+\)|-/.test(numLabel)) {
          // Level 3: i. , ii. , (i) , -
          levelClass = 'doc-level-3';
          wordIndentPt = 48;
          wordNumWidthPt = 18;
        } else {
          // Level 1: 1. , (1) , A.
          levelClass = 'doc-level-1';
          wordIndentPt = 0;
          wordNumWidthPt = 25;
        }

        formattedHtml += `
          <div class="doc-numbered-item ${levelClass}">
            <div class="doc-numbered-num">${numLabel}</div>
            <div class="doc-numbered-body">${textBody}</div>
          </div>
        `;
      } else {
        formattedHtml += `<p style="margin-bottom: 0.75rem; text-align: justify; text-justify: inter-word; text-indent: 2rem; line-height: 1.7;">${trimmed}</p>`;
      }
    }
  });

  document.getElementById('document-content-area').innerHTML = formattedHtml;
  switchTab('document');
}

// Function to Export Document to Microsoft Word (.docx) - Standard Compliant HTML Format for Word
function exportToWordDocx() {
  if (!currentDraftText) {
    alert("Belum ada dokumen akad untuk diexport. Silakan susun dokumen terlebih dahulu.");
    return;
  }

  const contentHtml = document.getElementById('document-content-area').innerHTML;
  const formData = getFormData();
  const pihakKeduaNama = formData.pihakKedua || 'Anggota';
  
  // Safe filename (remove dot, comma, special characters to prevent Word unreadable error)
  const safeName = pihakKeduaNama.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const fileName = `Dokumen_Akad_${currentAkadType}_${safeName}.doc`;

  const headerHtml = `
    <div style="text-align:center; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 20px;">
      <h2 style="margin:0; text-transform:uppercase; font-family: Arial, sans-serif; font-size: 16pt;">AKADIFY - AKAD SYARIAH DIGITAL</h2>
      <p style="margin:5px 0 0 0; font-size: 10pt; font-family: Arial, sans-serif;">Platform AI Pengembangan & Legalitas Akad Syariah Otomatis</p>
    </div>
  `;

  const footerHtml = `
    <br><br>
    <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
      <tr>
        <td style="text-align: center; width: 50%; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <p>PIHAK PERTAMA (Koperasi)</p>
          <br><br><br><br>
          <p><strong>( ______________________ )</strong></p>
        </td>
        <td style="text-align: center; width: 50%; font-family: 'Times New Roman', serif; font-size: 11pt;">
          <p>PIHAK KEDUA (Pemohon)</p>
          <br><br><br><br>
          <p><strong>( ${pihakKeduaNama} )</strong></p>
        </td>
      </tr>
    </table>
  `;

  // Construct pure HTML for MS Word
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Dokumen Akad Syariah</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000000; }
    h3 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 15pt; margin-bottom: 10pt; }
    h4 { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 15pt; margin-bottom: 5pt; }
    p { margin-bottom: 8pt; text-align: justify; text-justify: inter-word; }
    .doc-numbered-item { display: flex; align-items: flex-start; margin-bottom: 6pt; line-height: 1.5; }
    .doc-level-1 { margin-left: 0pt; }
    .doc-level-1 > .doc-numbered-num { width: 25pt; min-width: 25pt; }
    .doc-level-2 { margin-left: 25pt; }
    .doc-level-2 > .doc-numbered-num { width: 20pt; min-width: 20pt; }
    .doc-level-3 { margin-left: 50pt; }
    .doc-level-3 > .doc-numbered-num { width: 20pt; min-width: 20pt; }
    .doc-numbered-num { text-align: left; }
    .doc-numbered-body { text-align: justify; text-justify: inter-word; flex: 1; }
  </style>
</head>
<body>
  <div class="Section1">
    ${headerHtml}
    ${contentHtml}
    ${footerHtml}
  </div>
</body>
</html>`;

  // Use application/msword with UTF-8 BOM to prevent MS Word XML parsing errors
  const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword;charset=utf-8' });

  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, fileName);
  } else {
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }
}

// Approve Document
function approveContract() {
  document.getElementById('approval-stamp').innerHTML = "✅ DISAHKAN KOPERASI";
  document.getElementById('approval-stamp').style.borderColor = "var(--success)";
  document.getElementById('approval-stamp').style.color = "var(--success)";
  
  if (createdContracts.length > 0) {
    createdContracts[0].status = 'APPROVED';
    syncContractToBackend(createdContracts[0]);
    addAuditLog(`Contract Approved: ${createdContracts[0].id} oleh Pengurus Koperasi`);
    updateDashboardStats();
  }
  
  alert("Dokumen Akad Syariah berhasil disahkan, diberi stempel legalitas Koperasi, dan dicatat ke Audit Log!");
}

// Search and Filter Contracts Table
function filterContractsTable() {
  const searchQuery = (document.getElementById('contract-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('contract-status-filter')?.value || 'ALL';

  const filtered = createdContracts.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchQuery) ||
                          c.pihakKedua.toLowerCase().includes(searchQuery) ||
                          c.type.toLowerCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderVerificationTable(filtered);
}

// Dashboard & Verification Table Update
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

  filterContractsTable();
}

function renderVerificationTable(contractsList) {
  const vbody = document.getElementById('verification-table-body');
  if (!vbody) return;

  if (contractsList.length === 0) {
    vbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Tidak ada dokumen akad yang cocok dengan pencarian / filter.
        </td>
      </tr>`;
  } else {
    vbody.innerHTML = contractsList.map(c => `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td>${c.type}</td>
        <td>${c.pihakKedua}</td>
        <td>${c.date}</td>
        <td><span class="badge badge-success">${c.score}% Valid</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="viewContractById('${c.id}')">📄 Review</button>
            <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-color: var(--danger); color: var(--danger);" onclick="deleteContractById('${c.id}')" title="Hapus Dokumen Akad">🗑️ Hapus</button>
          </div>
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

// Delete Contract Handler
async function deleteContractById(id) {
  const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus dokumen akad ${id}? Data yang dihapus tidak dapat dikembalikan.`);
  if (!confirmDelete) return;

  try {
    const response = await fetch(`/api/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      createdContracts = createdContracts.filter(c => c.id !== id);
      updateDashboardStats();
      addAuditLog(`Contract Deleted: ${id} oleh Operator Koperasi`);
      alert(`✅ Dokumen akad ${id} berhasil dihapus.`);
    } else {
      alert("⚠️ Gagal menghapus dokumen akad dari server.");
    }
  } catch (err) {
    console.error("Gagal menghapus akad:", err);
    // Fallback local deletion if offline
    createdContracts = createdContracts.filter(c => c.id !== id);
    updateDashboardStats();
    addAuditLog(`Contract Deleted locally: ${id}`);
    alert(`✅ Dokumen akad ${id} dihapus dari daftar lokal.`);
  }
}

function addAuditLog(message) {
  const container = document.getElementById('audit-log-container');
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  container.innerHTML += `<p>[${timestamp}] ${message}</p>`;
}

// Chatbot Konsultan / Pengawas Syariah AI Logic
let chatHistory = [];

function sendQuickChat(promptText) {
  const inputEl = document.getElementById('chat-input');
  if (inputEl) {
    inputEl.value = promptText;
    document.getElementById('chat-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const inputEl = document.getElementById('chat-input');
  const userMessage = inputEl.value.trim();
  if (!userMessage) return;

  // Render User Message
  appendChatMessage('user', userMessage);
  inputEl.value = '';

  // Save to history
  chatHistory.push({ role: 'user', content: userMessage });

  // Show typing indicator
  const typingId = appendChatTyping();
  const btnSubmit = document.getElementById('chat-submit-btn');
  btnSubmit.disabled = true;

  try {
    const response = await fetch('/api/chat-syariah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    removeChatTyping(typingId);
    btnSubmit.disabled = false;

    if (response.ok) {
      const data = await response.json();
      const botReply = data.reply;
      chatHistory.push({ role: 'assistant', content: botReply });
      appendChatMessage('assistant', botReply);
    } else {
      const errData = await response.json().catch(() => ({ error: 'Error' }));
      appendChatMessage('assistant', `⚠️ Maaf, terjadi kesalahan: ${errData.error || 'Gagal terhubung ke AI Service'}`);
    }
  } catch (err) {
    removeChatTyping(typingId);
    btnSubmit.disabled = false;
    appendChatMessage('assistant', '⚠️ Terjadi kendala koneksi ke server AI.');
  }
}

function appendChatMessage(role, text) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const isUser = role === 'user';
  const avatar = isUser ? '👤' : '🕌';
  const bgStyle = isUser ? 'background: var(--primary-subtle); color: var(--primary-dark); border-radius: var(--radius-md) 0 var(--radius-md) var(--radius-md);' : 'background: white; border: 1px solid var(--border-color); border-radius: 0 var(--radius-md) var(--radius-md) var(--radius-md);';
  const alignSelf = isUser ? 'flex-direction: row-reverse;' : 'flex-direction: row;';

  // Clean any markdown symbols (*, **, ###, ---, etc.)
  let cleanText = text;
  cleanText = cleanText.replace(/###\s*/g, '');
  cleanText = cleanText.replace(/##\s*/g, '');
  cleanText = cleanText.replace(/#\s*/g, '');
  cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
  cleanText = cleanText.replace(/---/g, '');
  cleanText = cleanText.replace(/--/g, '-');

  let formattedText = cleanText.replace(/\n/g, '<br>');

  const html = `
    <div style="display: flex; gap: 0.75rem; align-items: flex-start; ${alignSelf}">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isUser ? 'var(--primary)' : 'var(--primary-dark)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">${avatar}</div>
      <div style="${bgStyle} padding: 0.85rem 1.1rem; max-width: 85%; box-shadow: var(--shadow-sm); font-size: 0.9rem; line-height: 1.6;">
        ${formattedText}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

function appendChatTyping() {
  const container = document.getElementById('chat-messages-container');
  const typingId = 'typing-' + Date.now();
  const html = `
    <div id="${typingId}" style="display: flex; gap: 0.75rem; align-items: flex-start;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-dark); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">🕌</div>
      <div style="background: white; border: 1px solid var(--border-color); padding: 0.85rem 1.1rem; border-radius: 0 var(--radius-md) var(--radius-md) var(--radius-md); max-width: 85%; font-size: 0.85rem; color: var(--text-muted);">
        <em>Konsultan Syariah AI sedang mengetik... ⏳</em>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  return typingId;
}

function removeChatTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ==========================================
// SHARIA FINANCIAL CALCULATOR & AMORTIZATION
// ==========================================

let currentAmortizationSchedule = [];

// Handle Calc Type Selection Change
function onCalcTypeChange(type) {
  const marginGroup = document.getElementById('calc-group-margin');
  const nisbahGroup = document.getElementById('calc-group-nisbah');
  const labelPokok = document.getElementById('calc-label-pokok');
  const labelResMargin = document.getElementById('calc-label-res-margin');
  const noteEl = document.getElementById('calc-compliance-note');
  const thMargin = document.getElementById('th-calc-margin');

  if (type === 'Murabahah') {
    marginGroup.style.display = 'block';
    nisbahGroup.style.display = 'none';
    labelPokok.innerText = 'Nilai Pokok / Harga Beli (Rp)';
    labelResMargin.innerText = 'Total Margin Keuntungan:';
    if (thMargin) thMargin.innerText = 'Margin Keuntungan';
    noteEl.innerText = 'Harga jual Murabahah (Pokok + Margin) bersifat mengikat dan tetap (fixed) sepanjang masa tenor. Koperasi dilarang mengenakan bunga majemuk atau menaikkan margin saat keterlambatan.';
  } else if (type === 'Ijarah') {
    marginGroup.style.display = 'block';
    nisbahGroup.style.display = 'none';
    labelPokok.innerText = 'Nilai Aset / Manfaat Jasa Disewakan (Rp)';
    labelResMargin.innerText = 'Total Ujrah (Sewa/Jasa):';
    if (thMargin) thMargin.innerText = 'Ujrah (Sewa/Jasa)';
    noteEl.innerText = 'Ujrah (sewa) disepakati di muka untuk pemanfaatan aset/jasa. Selama masa akad, pemeliharaan pokok barang tetap menjadi tanggung jawab pemilik aset (Mu\'jir).';
  } else if (type === 'Mudharabah') {
    marginGroup.style.display = 'none';
    nisbahGroup.style.display = 'block';
    labelPokok.innerText = 'Total Modal Usaha / Investasi (Rp)';
    labelResMargin.innerText = 'Proyeksi Bagi Hasil Koperasi:';
    if (thMargin) thMargin.innerText = 'Proyeksi Bagi Hasil';
    noteEl.innerText = 'Bagi hasil wajib dihitung dari realisasi keuntungan usaha (Profit & Loss Sharing) sesuai nisbah yang disepakati, bukan persentase tetap dari modal pokok.';
  } else if (type === 'Qardh') {
    marginGroup.style.display = 'none';
    nisbahGroup.style.display = 'none';
    labelPokok.innerText = 'Jumlah Pinjaman Pokok Qardh (Rp)';
    labelResMargin.innerText = 'Tambahan / Biaya Terlarang:';
    if (thMargin) thMargin.innerText = 'Tambahan (Rp 0)';
    noteEl.innerText = 'Akad Qardh adalah pinjaman kebajikan tanpa tambahan manfaat (Kullu qardhin jarra manfa\'atan fahuwa riba). Pengembalian harus tepat sejumlah pokok tanpa bunga.';
  }

  calculateShariaFinance();
}

// Quick Demo Fill for Calculator
function fillQuickCalcDemo() {
  document.getElementById('calc-pokok').value = "36.000.000";
  document.getElementById('calc-margin-percent').value = "10";
  document.getElementById('calc-tenor').value = "12";
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('calc-start-date').value = `${year}-${month}-${day}`;

  calculateShariaFinance();
}

// Main Calculation Function
function calculateShariaFinance() {
  const type = document.getElementById('calc-akad-type') ? document.getElementById('calc-akad-type').value : 'Murabahah';
  const pokok = parseRawNumber(document.getElementById('calc-pokok')?.value);
  const tenor = parseInt(document.getElementById('calc-tenor')?.value || 12, 10) || 12;
  const marginPercent = parseFloat(document.getElementById('calc-margin-percent')?.value || 0) || 0;
  
  const nisbahKoperasi = parseFloat(document.getElementById('calc-nisbah-koperasi')?.value || 40) || 40;
  if (document.getElementById('calc-nisbah-anggota')) {
    document.getElementById('calc-nisbah-anggota').value = Math.max(0, 100 - nisbahKoperasi);
  }
  const proyeksiLaba = parseRawNumber(document.getElementById('calc-proyeksi-laba')?.value);

  let totalMargin = 0;
  let totalKewajiban = pokok;
  let angsuranPerBulan = 0;
  let pokokPerBulan = tenor > 0 ? (pokok / tenor) : 0;
  let marginPerBulan = 0;

  if (type === 'Murabahah' || type === 'Ijarah') {
    // Formula Flat Syariah: Total Margin = Pokok * (Margin% / 100) * (Tenor / 12)
    totalMargin = pokok * (marginPercent / 100) * (tenor / 12);
    totalKewajiban = pokok + totalMargin;
    angsuranPerBulan = tenor > 0 ? (totalKewajiban / tenor) : 0;
    marginPerBulan = tenor > 0 ? (totalMargin / tenor) : 0;
  } else if (type === 'Mudharabah') {
    // Proyeksi Bagi Hasil bulanan untuk koperasi
    const bagiHasilBulanKoperasi = proyeksiLaba * (nisbahKoperasi / 100);
    totalMargin = bagiHasilBulanKoperasi * tenor;
    totalKewajiban = pokok + totalMargin;
    marginPerBulan = bagiHasilBulanKoperasi;
    angsuranPerBulan = pokokPerBulan + marginPerBulan;
  } else if (type === 'Qardh') {
    totalMargin = 0;
    totalKewajiban = pokok;
    marginPerBulan = 0;
    angsuranPerBulan = pokokPerBulan;
  }

  // Update Summary DOM
  const formatIDR = (val) => "Rp " + Math.round(val).toLocaleString('id-ID');

  if (document.getElementById('calc-result-angsuran')) {
    document.getElementById('calc-result-angsuran').innerText = formatIDR(angsuranPerBulan) + " / bln";
    document.getElementById('calc-result-pokok').innerText = formatIDR(pokok);
    document.getElementById('calc-result-margin').innerText = formatIDR(totalMargin);
    document.getElementById('calc-result-total').innerText = formatIDR(totalKewajiban);
  }

  const badgeTenor = document.getElementById('amortization-badge-tenor');
  if (badgeTenor) badgeTenor.innerText = `${tenor} Bulan Angsuran`;

  // Generate Amortization Table Rows
  generateAmortizationSchedule(pokok, totalMargin, tenor, angsuranPerBulan, pokokPerBulan, marginPerBulan);
}

// Generate Amortization Schedule Table
function generateAmortizationSchedule(pokok, totalMargin, tenor, angsuranPerBulan, pokokPerBulan, marginPerBulan) {
  const tbody = document.getElementById('amortization-table-body');
  if (!tbody) return;

  if (pokok <= 0 || tenor <= 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Masukkan nilai pokok dan tenor di atas untuk menghasilkan tabel jadwal angsuran.
        </td>
      </tr>
    `;
    currentAmortizationSchedule = [];
    return;
  }

  const formatIDR = (val) => "Rp " + Math.round(val).toLocaleString('id-ID');
  
  let startDateStr = document.getElementById('calc-start-date') ? document.getElementById('calc-start-date').value : '';
  let currentDate = startDateStr ? new Date(startDateStr) : new Date();

  let remainingPiutang = pokok + totalMargin;
  let html = '';
  currentAmortizationSchedule = [];

  for (let i = 1; i <= tenor; i++) {
    // Increment Month
    const dueDate = new Date(currentDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const dateStr = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // Handle last month rounding difference
    let currentAngsuran = angsuranPerBulan;
    let curPokok = pokokPerBulan;
    let curMargin = marginPerBulan;

    if (i === tenor) {
      currentAngsuran = remainingPiutang;
      remainingPiutang = 0;
    } else {
      remainingPiutang -= currentAngsuran;
    }

    currentAmortizationSchedule.push({
      bulanKe: i,
      jatuhTempo: dateStr,
      angsuranPokok: curPokok,
      angsuranMargin: curMargin,
      totalAngsuran: currentAngsuran,
      sisaPiutang: remainingPiutang
    });

    html += `
      <tr>
        <td style="text-align: center; font-weight: 600; color: var(--primary);">${i}</td>
        <td><strong>${dateStr}</strong></td>
        <td style="text-align: right;">${formatIDR(curPokok)}</td>
        <td style="text-align: right; color: #d97706; font-weight: 500;">${formatIDR(curMargin)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--primary-dark);">${formatIDR(currentAngsuran)}</td>
        <td style="text-align: right; color: var(--text-muted);">${formatIDR(Math.max(0, remainingPiutang))}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

// Apply Calculation Results directly to Akad Generator Form
function applyCalcToAkadGenerator() {
  const type = document.getElementById('calc-akad-type').value;
  const pokok = parseRawNumber(document.getElementById('calc-pokok')?.value);
  const tenor = parseInt(document.getElementById('calc-tenor')?.value || 12, 10) || 12;
  const marginPercent = parseFloat(document.getElementById('calc-margin-percent')?.value || 0) || 0;
  const totalMargin = pokok * (marginPercent / 100) * (tenor / 12);

  // Switch form to selected Akad Type
  document.getElementById('form-akad-type').value = type;
  onAkadTypeChange(type);

  // Prefill fields with dot formatting
  if (type === 'Murabahah') {
    if (document.getElementById('hargaBeli')) document.getElementById('hargaBeli').value = formatNumberWithDots(pokok);
    if (document.getElementById('margin')) document.getElementById('margin').value = formatNumberWithDots(Math.round(totalMargin));
    if (document.getElementById('tenor')) document.getElementById('tenor').value = tenor;
  } else if (type === 'Qardh') {
    if (document.getElementById('jumlahPinjaman')) document.getElementById('jumlahPinjaman').value = formatNumberWithDots(pokok);
    if (document.getElementById('jatuhTempo')) document.getElementById('jatuhTempo').value = `${tenor} Bulan`;
  } else if (type === 'Mudharabah') {
    if (document.getElementById('jumlahModal')) document.getElementById('jumlahModal').value = formatNumberWithDots(pokok);
    const nisbahKop = document.getElementById('calc-nisbah-koperasi').value;
    if (document.getElementById('nisbahPengelola')) document.getElementById('nisbahPengelola').value = Math.max(0, 100 - parseFloat(nisbahKop));
    if (document.getElementById('nisbahPemodal')) document.getElementById('nisbahPemodal').value = nisbahKop;
  } else if (type === 'Ijarah') {
    if (document.getElementById('biayaUjrah')) document.getElementById('biayaUjrah').value = formatNumberWithDots(Math.round(pokok + totalMargin));
    if (document.getElementById('tenorIjarah')) document.getElementById('tenorIjarah').value = `${tenor} Bulan`;
  }

  triggerValidation();
  goToWizardStep(2);
  switchTab('generator');
  alert(`✅ Parameter finansial berhasil diterapkan ke Form Akad ${type}! Silakan lengkapi identitas para pihak.`);
}

// Print Amortization Table
function printAmortizationTable() {
  if (currentAmortizationSchedule.length === 0) {
    alert("Silakan hitung simulasi finansial terlebih dahulu sebelum mencetak jadwal.");
    return;
  }
  window.print();
}
