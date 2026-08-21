const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load Knowledge Base (Fatwa DSN-MUI & Standard Form Templates) dari folder knowledge_base/
const knowledgeBaseDir = path.join(__dirname, 'knowledge_base');
let knowledgeBaseTexts = {};

if (fs.existsSync(knowledgeBaseDir)) {
  const files = fs.readdirSync(knowledgeBaseDir);
  files.forEach(file => {
    if (file.endsWith('.txt')) {
      const content = fs.readFileSync(path.join(knowledgeBaseDir, file), 'utf-8');
      knowledgeBaseTexts[file] = content;
    }
  });
  console.log(`Knowledge Base berhasil dimuat: ${Object.keys(knowledgeBaseTexts).length} berkas.`);
}

// Helper untuk mengambil template & fatwa yang paling sesuai berdasarkan tipe akad
function getKnowledgeContextForAkad(tipeAkad) {
  let context = "";
  const akadLower = (tipeAkad || "").toLowerCase();

  // Fatwa dasar DSN-MUI Koperasi & Qardh selalu disertakan bila relevan
  if (knowledgeBaseTexts['141_-_Koperasi_Syariah.txt']) {
    context += `=== FATWA DSN-MUI NO. 141 (PEDOMAN PENYELENGGARAAN KOPERASI SYARIAH) ===\n` + 
               knowledgeBaseTexts['141_-_Koperasi_Syariah.txt'].substring(0, 3000) + `\n\n`;
  }

  if (akadLower.includes('murabahah') || akadLower.includes('jual beli')) {
    if (knowledgeBaseTexts['04-Murabahah.txt']) {
      context += `=== FATWA DSN-MUI NO. 04 (MURABAHAH) ===\n` + knowledgeBaseTexts['04-Murabahah.txt'] + `\n\n`;
    }
    if (knowledgeBaseTexts['111_-_Akad_Jual_Beli_Murabahah.txt']) {
      context += `=== TEMPLATE STANDAR FATWA DSN-MUI 111 (AKAD JUAL BELI MURABAHAH) ===\n` + knowledgeBaseTexts['111_-_Akad_Jual_Beli_Murabahah.txt'] + `\n\n`;
    }
    if (knowledgeBaseTexts['110_-_Akad_Jual_Beli.txt']) {
      context += `=== TEMPLATE STANDAR FATWA DSN-MUI 110 (AKAD JUAL BELI) ===\n` + knowledgeBaseTexts['110_-_Akad_Jual_Beli.txt'] + `\n\n`;
    }
  } else if (akadLower.includes('ijarah') || akadLower.includes('sewa')) {
    if (knowledgeBaseTexts['112_-_Akad_Ijarah.txt']) {
      context += `=== TEMPLATE STANDAR FATWA DSN-MUI 112 (AKAD IJARAH / SEWA) ===\n` + knowledgeBaseTexts['112_-_Akad_Ijarah.txt'] + `\n\n`;
    }
  } else if (akadLower.includes('mudharabah') || akadLower.includes('bagi hasil')) {
    if (knowledgeBaseTexts['115_-_Akad_Mudharabah.txt']) {
      context += `=== TEMPLATE STANDAR FATWA DSN-MUI 115 (AKAD MUDHARABAH) ===\n` + knowledgeBaseTexts['115_-_Akad_Mudharabah.txt'] + `\n\n`;
    }
    if (knowledgeBaseTexts['114_-_Akad_Syirkah.txt']) {
      context += `=== TEMPLATE STANDAR FATWA DSN-MUI 114 (AKAD SYIRKAH / KEMITRAAN) ===\n` + knowledgeBaseTexts['114_-_Akad_Syirkah.txt'] + `\n\n`;
    }
  } else if (akadLower.includes('qardh') || akadLower.includes('pinjaman')) {
    if (knowledgeBaseTexts['19-Qardh.txt']) {
      context += `=== FATWA DSN-MUI NO. 19 (AKAD QARDH) ===\n` + knowledgeBaseTexts['19-Qardh.txt'] + `\n\n`;
    }
  }

  // Jika belum ada template spesifik, berikan ringkasan seluruh fatwa
  if (!context) {
    Object.keys(knowledgeBaseTexts).forEach(key => {
      context += `=== SUMBER ${key} ===\n` + knowledgeBaseTexts[key].substring(0, 2000) + `\n\n`;
    });
  }

  return context;
}

// API Endpoint proxy untuk DeepSeek AI mengisi template baku akad dengan rujukan Fatwa DSN-MUI PDF
app.post('/api/generate-akad', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const { akadData, validationResult } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key DeepSeek belum dikonfigurasi di Environment Variable Railway (DEEPSEEK_API_KEY).' 
    });
  }

  try {
    const knowledgeContext = getKnowledgeContextForAkad(akadData.tipeAkad);

    const prompt = `Anda adalah Notaris Hukum Syariah dan Asisten AI Koperasi Syariah.
Tugas Anda adalah membuat/mengisi dokumen akad syariah resmi (${akadData.tipeAkad}) dengan format komplit dan rapi persis seperti standar perbankan syariah / Koperasi Syariah berdasarkan TEMPLATE STANDAR & FATWA DSN-MUI RESMI berikut.

=== KNOWLEDGE BASE RESMI FATWA & TEMPLATE STANDAR DSN-MUI ===
${knowledgeContext}

=== PENTING DAN WAJIB DIPATUHI ===
1. Gunakan susunan pasal-pasal, ayat-ayat, dalil Al-Qur'an/Hadits, dan ketentuan syariah yang 100% SESUAI DENGAN FATWA DAN TEMPLATE STANDAR DSN-MUI di atas.
2. JANGAN MENGGUNAKAN SIMBOL MARKDOWN SAMA SEKALI (seperti **, *, __, #, dll). Tuliskan dokumen dalam TEKS POLOS (plain text) yang bersih dan siap dicetak.
3. BAGIAN PEMBUKA DAN IDENTITAS PARA PIHAK HARUS DITULIS LENGKAP DAN DETAIL SESUAI DATA INPUT DENGAN STRUKTUR SEPERTI INI:

Dengan memohon petunjuk dan ridho Allah SWT, akad pembiayaan ${akadData.tipeAkad} ini dibuat dan ditandatangani pada ${akadData.tanggalAkad || 'hari ini'}, bertempat di ${akadData.tempatAkad || 'Kantor Koperasi'}, oleh para pihak sebagai berikut:

1. Nama: ${akadData.pihakPertama || '-'}
   Umur: ${akadData.umurPihak1 || '-'}
   NIK: ${akadData.nikPihak1 || '-'}
   Jabatan: ${akadData.jabatanPihak1 || 'Pengurus Koperasi'}
   Alamat: ${akadData.alamatPihak1 || '-'}
   
   Dalam hal ini bertindak untuk dan atas nama ${akadData.lembagaPihak1 || 'Koperasi Syariah'} yang berkantor dan berkedudukan di ${akadData.alamatPihak1 || '-'}, selanjutnya disebut sebagai Pihak Pertama.

2. Nama: ${akadData.pihakKedua || '-'}
   Umur: ${akadData.umurPihak2 || '-'}
   NIK: ${akadData.nikPihak2 || '-'}
   Pekerjaan: ${akadData.pekerjaanPihak2 || '-'}
   Alamat: ${akadData.alamatPihak2 || '-'}
   
   Dalam hal ini bertindak untuk dan atas namanya sendiri, selanjutnya disebut sebagai Pihak Kedua.

4. DI AKHIR AKAD SETELAH PASAL PENUTUP, JANGAN membuat daftar tanda tangan vertikal berjejer ke bawah. Cukup akhiri dengan kalimat penutup baku:
"Demikian akad ini dibuat dan ditandatangani oleh para pihak dalam keadaan sadar, sehat jasmani rohani, serta tanpa adanya paksaan dari pihak manapun."

=== DETAIL TRANSAKSI AKAD ===
Jenis Akad: ${akadData.tipeAkad}
Objek/Barang/Usaha: ${akadData.namaBarang || akadData.bidangUsaha || '-'} (Spesifikasi: ${akadData.spesifikasi || '-'})
Harga Pokok / Modal: Rp ${parseFloat(akadData.hargaBeli || akadData.jumlahModal || akadData.jumlahPinjaman || 0).toLocaleString('id-ID')}
Margin / Profit / Ujrah / Nisbah: Margin Rp ${parseFloat(akadData.margin || 0).toLocaleString('id-ID')} / Nisbah ${akadData.nisbahPengelola || 60}% : ${akadData.nisbahPemodal || 40}%
Uang Muka / Admin: Rp ${parseFloat(akadData.uangMuka || akadData.biayaAdmin || 0).toLocaleString('id-ID')}
Tenor / Jangka Waktu: ${akadData.tenor || akadData.tenorIjarah || akadData.jatuhTempo || 12} Bulan
Saksi 1: ${akadData.saksi1 || 'Saksi I'}
Saksi 2: ${akadData.saksi2 || 'Saksi II'}
`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Anda adalah Notaris Kontrak Syariah Koperasi yang memproses template akad hukum baku berdasarkan Fatwa DSN-MUI resmi. Hasilkan output berupa TEKS POLOS tanpa format markdown (tanpa tanda bintang ** atau *).' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `DeepSeek API Error: ${errorText}` });
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    res.json({ text: resultText });

  } catch (error) {
    console.error('Error proxying to DeepSeek:', error);
    res.status(500).json({ error: 'Gagal menghubungkan ke Backend AI.' });
  }
});

// API Endpoint proxy untuk Chatbot Konsultan / Pengawas Syariah AI (RAG dengan seluruh Fatwa & Template PDF)
app.post('/api/chat-syariah', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const { messages } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key belum dikonfigurasi di Environment Variable Railway (DEEPSEEK_API_KEY).' 
    });
  }

  // Gabungkan seluruh ringkasan Knowledge Base PDF Fatwa & Standar Akad DSN-MUI
  let fullKnowledgeBasePrompt = "";
  Object.keys(knowledgeBaseTexts).forEach(filename => {
    fullKnowledgeBasePrompt += `\n=== KNOWLEDGE BASE: ${filename} ===\n` + knowledgeBaseTexts[filename] + `\n`;
  });

  const systemPrompt = `Kamu adalah AI Konsultan dan Dewan Pengawas Syariah (Sharia Advisory Assistant) Koperasi. 
TUGAS UTAMA: Kamu memiliki akses pengetahuan lengkap ke seluruh FATWA RESMI DSN-MUI & TEMPLATE STANDAR AKAD SYARIAH berikut:

${fullKnowledgeBasePrompt}

## ATURAN MERESPONS
1. JAWABANMU HARUS SELALU DISANDARKAN DAN MERUJUK PADA FATWA DSN-MUI RESMI DI ATAS (Sebutkan Nomor Fatwa DSN-MUI yang relevan, seperti Fatwa No. 04 untuk Murabahah, Fatwa No. 19 untuk Qardh, Fatwa No. 141 untuk Koperasi Syariah, Fatwa 110/111 untuk Jual Beli, Fatwa 112 untuk Ijarah, Fatwa 114/115 untuk Syirkah/Mudharabah).
2. Jika pengguna bertanya tentang skema akad, aturan uang muka, nisbah bagi hasil, sewa, denda/tazir, jaminan, maupun keanggotaan Koperasi Syariah, kutip poin fatwa yang sesuai secara tepat.
3. Gunakan penomoran biasa (1., 2., 3.) atau strip (-).
4. PENTING: JANGAN MENGGUNAKAN SIMBOL MARKDOWN SAMA SEKALI (seperti bintang *, cetak tebal **, miring *, hashtag ###, atau garis ---). Tuliskan balasan dalam TEKS POLOS (plain text) yang bersih.`;

  try {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || [])
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: formattedMessages,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Backend API Error: ${errorText}` });
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    res.json({ reply: resultText });

  } catch (error) {
    console.error('Error in chat-syariah:', error);
    res.status(500).json({ error: 'Gagal terhubung ke AI Service Backend.' });
  }
});

// Tentukan direktori penyimpanan data terpasang (Volume Railway di /data)
const primaryDataDir = '/data';
const fallbackDataDir = path.join(__dirname, 'data');
const dataDir = fs.existsSync(primaryDataDir) ? primaryDataDir : fallbackDataDir;

if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {
    console.error('Gagal membuat direktori data:', e);
  }
}

const contractsFilePath = path.join(dataDir, 'contracts.json');
const usersFilePath = path.join(dataDir, 'users.json');

// Helper fungsi membaca daftar pengguna permanen
function loadUsers() {
  if (fs.existsSync(usersFilePath)) {
    try {
      const fileData = fs.readFileSync(usersFilePath, 'utf-8');
      return JSON.parse(fileData);
    } catch (e) {
      console.error('Gagal membaca users.json:', e);
      return [];
    }
  }
  return [];
}

// Helper fungsi menyimpan daftar pengguna permanen
function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Gagal menyimpan users.json:', e);
  }
}

// Helper fungsi membaca daftar akad dari berkas permanen
function loadContracts() {
  if (fs.existsSync(contractsFilePath)) {
    try {
      const fileData = fs.readFileSync(contractsFilePath, 'utf-8');
      return JSON.parse(fileData);
    } catch (e) {
      console.error('Gagal membaca berkas contracts.json:', e);
      return [];
    }
  }
  return [];
}

// Helper fungsi menyimpan daftar akad ke berkas permanen
function saveContracts(contracts) {
  try {
    fs.writeFileSync(contractsFilePath, JSON.stringify(contracts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Gagal menyimpan berkas contracts.json:', e);
  }
}

// API Endpoint Registrasi Pengguna Baru (Koperasi Syariah / DPS)
app.post('/api/auth/register', (req, res) => {
  const { userType, institutionName, legalNumber, fullname, email, username, password } = req.body;

  if (!username || !password || !fullname || !email || !userType) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
  }

  const users = loadUsers();
  const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    return res.status(400).json({ error: 'Username atau Email sudah terdaftar dalam sistem.' });
  }

  const newUser = {
    id: `USR-${Date.now()}`,
    userType, // 'KOPERASI' atau 'DPS'
    institutionName: institutionName || '',
    legalNumber: legalNumber || '', // No. AHU/SK Koperasi atau No. Sertifikat Rekomendasi DSN-MUI
    fullname,
    email,
    username: username.trim(),
    password: password.trim(), // In a live production system, passwords can be hashed
    createdAt: new Date().toISOString()
  };

  users.unshift(newUser);
  saveUsers(users);

  res.json({
    success: true,
    message: 'Registrasi berhasil!',
    user: {
      id: newUser.id,
      userType: newUser.userType,
      institutionName: newUser.institutionName,
      fullname: newUser.fullname,
      email: newUser.email,
      username: newUser.username
    }
  });
});

// API Endpoint untuk mengambil pengaturan White-Label Koperasi
app.get('/api/institution/settings', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'User ID diperlukan.' });
  }

  // Jika akun Demo, sediakan data default yang dapat dimodifikasi
  if (userId === 'USR-SUPERADMIN-DEMO' || userId === 'demo') {
    const users = loadUsers();
    const demoUser = users.find(u => u.id === 'USR-SUPERADMIN-DEMO' || u.username === 'demo');
    return res.json({
      settings: demoUser?.whiteLabel || {
        institutionName: 'KSPPS BMT BINA UMMAH SEJAHTERA',
        institutionTagline: 'Badan Hukum No. AHU-0012345.AH.01.26.TAHUN 2024',
        institutionAddress: 'Jl. Raya Pajajaran No. 45, Bandung, Jawa Barat | Telp: (022) 7654321',
        institutionEmail: 'kontak@bmtbinaummah.co.id',
        headerLogoUrl: 'logo_transparent.png',
        primaryColor: '#047857'
      }
    });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === userId || u.username === userId);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  res.json({
    settings: user.whiteLabel || {
      institutionName: user.institutionName || 'Koperasi Simpan Pinjam dan Pembiayaan Syariah',
      institutionTagline: user.legalNumber ? `Badan Hukum No. ${user.legalNumber}` : 'Platform Penyusunan Akad Syariah Resmi',
      institutionAddress: '',
      institutionEmail: user.email || '',
      headerLogoUrl: '',
      primaryColor: '#047857'
    }
  });
});

// API Endpoint untuk menyimpan pengaturan White-Label Koperasi
app.post('/api/institution/settings', (req, res) => {
  const { userId, whiteLabel } = req.body;
  if (!userId || !whiteLabel) {
    return res.status(400).json({ error: 'Data pengaturan tidak lengkap.' });
  }

  const users = loadUsers();
  let userIndex = users.findIndex(u => u.id === userId || u.username === userId);

  // Jika user demo belum ada di users.json, buat entri-nya
  if (userIndex === -1 && (userId === 'USR-SUPERADMIN-DEMO' || userId === 'demo')) {
    const demoObj = {
      id: 'USR-SUPERADMIN-DEMO',
      username: 'demo',
      userType: 'SUPERADMIN',
      institutionName: whiteLabel.institutionName || 'AKADIFY Pusat',
      whiteLabel: whiteLabel,
      createdAt: new Date().toISOString()
    };
    users.unshift(demoObj);
    userIndex = 0;
  }

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  users[userIndex].whiteLabel = whiteLabel;
  if (whiteLabel.institutionName) {
    users[userIndex].institutionName = whiteLabel.institutionName;
  }
  if (whiteLabel.institutionTagline) {
    users[userIndex].legalNumber = whiteLabel.institutionTagline;
  }

  saveUsers(users);
  res.json({ success: true, message: 'Pengaturan White-Label berhasil disimpan!', whiteLabel });
});

// API Endpoint untuk mengambil profil lengkap user
app.get('/api/user/profile', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'User ID diperlukan.' });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === userId || u.username === userId);
  if (!user && (userId === 'USR-SUPERADMIN-DEMO' || userId === 'demo')) {
    return res.json({
      user: {
        id: 'USR-SUPERADMIN-DEMO',
        username: 'demo',
        fullname: 'Administrator Demo Syariah',
        email: 'admin@bmtbinaummah.co.id',
        phone: '081234567890',
        userType: 'SUPERADMIN',
        institutionName: 'KSPPS BMT BINA UMMAH SEJAHTERA',
        position: 'Ketua / Pengurus Utama'
      }
    });
  }

  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone || '',
      userType: user.userType,
      institutionName: user.institutionName,
      legalNumber: user.legalNumber,
      position: user.position || 'Pengurus / Legal Officer'
    }
  });
});

// API Endpoint untuk memperbarui profil user
app.post('/api/user/profile', (req, res) => {
  const { userId, fullname, email, phone, position, institutionName } = req.body;
  if (!userId || !fullname || !email) {
    return res.status(400).json({ error: 'Nama lengkap dan email wajib diisi.' });
  }

  const users = loadUsers();
  let userIndex = users.findIndex(u => u.id === userId || u.username === userId);

  if (userIndex === -1 && (userId === 'USR-SUPERADMIN-DEMO' || userId === 'demo')) {
    const demoObj = {
      id: 'USR-SUPERADMIN-DEMO',
      username: 'demo',
      fullname,
      email,
      phone: phone || '',
      position: position || 'Pengurus Utama',
      institutionName: institutionName || 'KSPPS BMT BINA UMMAH SEJAHTERA',
      userType: 'SUPERADMIN',
      createdAt: new Date().toISOString()
    };
    users.unshift(demoObj);
    userIndex = 0;
  }

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  users[userIndex].fullname = fullname.trim();
  users[userIndex].email = email.trim();
  if (phone) users[userIndex].phone = phone.trim();
  if (position) users[userIndex].position = position.trim();
  if (institutionName) users[userIndex].institutionName = institutionName.trim();

  saveUsers(users);

  res.json({
    success: true,
    message: 'Profil pengguna berhasil diperbarui!',
    user: {
      id: users[userIndex].id,
      username: users[userIndex].username,
      fullname: users[userIndex].fullname,
      email: users[userIndex].email,
      phone: users[userIndex].phone,
      position: users[userIndex].position,
      userType: users[userIndex].userType,
      institutionName: users[userIndex].institutionName
    }
  });
});

// API Endpoint untuk mengganti kata sandi (Change Password)
app.post('/api/user/change-password', (req, res) => {
  const { userId, oldPassword, newPassword, confirmPassword } = req.body;
  
  if (!userId || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Harap isi semua kolom password.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Konfirmasi password baru tidak cocok.' });
  }

  const users = loadUsers();
  let userIndex = users.findIndex(u => u.id === userId || u.username === userId);

  if (userIndex === -1 && (userId === 'USR-SUPERADMIN-DEMO' || userId === 'demo')) {
    const demoObj = {
      id: 'USR-SUPERADMIN-DEMO',
      username: 'demo',
      password: newPassword,
      userType: 'SUPERADMIN',
      fullname: 'Administrator Demo Syariah',
      email: 'demo@akadify.id',
      createdAt: new Date().toISOString()
    };
    users.unshift(demoObj);
    userIndex = 0;
  }

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  // Jika bukan user demo tanpa password lama terdaftar
  if (users[userIndex].password && users[userIndex].password !== oldPassword && oldPassword !== 'demo') {
    return res.status(400).json({ error: 'Kata sandi saat ini (lama) tidak sesuai.' });
  }

  users[userIndex].password = newPassword.trim();
  saveUsers(users);

  res.json({
    success: true,
    message: 'Kata sandi berhasil diubah! Silakan gunakan kata sandi baru untuk login berikutnya.'
  });
});

// API Endpoint Login Nyata
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Masukkan username dan password.' });
  }

  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();

  // Akun Demo Resmi Bawaan Sistem (Superadmin: Akses Penuh / Global)
  if (trimmedUser === 'demo' && trimmedPass === 'demo') {
    return res.json({
      success: true,
      message: 'Login Superadmin Demo berhasil!',
      user: {
        id: 'USR-SUPERADMIN-DEMO',
        userType: 'SUPERADMIN',
        institutionName: 'AKADIFY Pusat (Superadmin)',
        fullname: 'Superadmin Pengawas (Demo)',
        email: 'superadmin@akadify.id',
        username: 'demo'
      }
    });
  }

  const users = loadUsers();
  const user = users.find(u => 
    (u.username.toLowerCase() === trimmedUser || u.email.toLowerCase() === trimmedUser) &&
    u.password === trimmedPass
  );

  if (!user) {
    return res.status(401).json({ error: 'Username/Email atau Password tidak sesuai.' });
  }

  res.json({
    success: true,
    message: 'Login berhasil!',
    user: {
      id: user.id,
      userType: user.userType,
      institutionName: user.institutionName,
      fullname: user.fullname,
      email: user.email,
      username: user.username
    }
  });
});

// API Endpoint untuk mengambil seluruh data akad terpanen (Dengan Multi-Tenant Data Isolation)
app.get('/api/contracts', (req, res) => {
  const { userId, userType } = req.query;
  const allContracts = loadContracts();

  // Jika SUPERADMIN atau DPS (Dewan Pengawas Syariah): Berwenang mengawasi dan melihat seluruh akad dari semua koperasi
  if (userType === 'SUPERADMIN' || userType === 'DPS' || userId === 'USR-SUPERADMIN-DEMO') {
    return res.json({ contracts: allContracts });
  }

  // Jika Koperasi Syariah: Hanya mengambil dan melihat akad miliknya sendiri (Terisolasi)
  if (userId) {
    const userContracts = allContracts.filter(c => c.createdByUserId === userId || !c.createdByUserId);
    return res.json({ contracts: userContracts });
  }

  res.json({ contracts: allContracts });
});

// API Endpoint untuk menyimpan data akad baru atau memperbarui status akad secara permanen
app.post('/api/contracts', (req, res) => {
  const { contract } = req.body;
  if (!contract || !contract.id) {
    return res.status(400).json({ error: 'Data akad tidak valid.' });
  }

  const contracts = loadContracts();
  const existingIndex = contracts.findIndex(c => c.id === contract.id);

  if (existingIndex >= 0) {
    // Preserve owner institution metadata saat update/approve
    contracts[existingIndex] = {
      ...contracts[existingIndex],
      ...contract,
      createdByUserId: contracts[existingIndex].createdByUserId || contract.createdByUserId,
      institutionName: contracts[existingIndex].institutionName || contract.institutionName
    };
  } else {
    contracts.unshift(contract);
  }

  saveContracts(contracts);
  res.json({ success: true, contracts });
});

// API Endpoint untuk menghapus data akad
app.delete('/api/contracts/:id', (req, res) => {
  const { id } = req.params;
  let contracts = loadContracts();
  const initialLength = contracts.length;
  contracts = contracts.filter(c => c.id !== id);

  if (contracts.length === initialLength) {
    return res.status(404).json({ error: 'Dokumen akad tidak ditemukan.' });
  }

  saveContracts(contracts);
  res.json({ success: true, message: `Akad ${id} berhasil dihapus.`, contracts });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Akad Syariah (AKADIFY) berjalan di port ${PORT}. Knowledge Base berisi ${Object.keys(knowledgeBaseTexts).length} fatwa/template DSN-MUI.`);
});
