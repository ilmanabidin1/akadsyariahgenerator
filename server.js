const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load template Murabahah dari file extracted_template.txt
let templateMurabahah = "";
const templatePath = path.join(__dirname, 'extracted_template.txt');
if (fs.existsSync(templatePath)) {
  templateMurabahah = fs.readFileSync(templatePath, 'utf-8');
}

// Load teks Fatwa DSN-MUI No 04 tentang Murabahah dari fatwa_murabahah_text.txt
let fatwaMurabahah = "";
const fatwaPath = path.join(__dirname, 'fatwa_murabahah_text.txt');
if (fs.existsSync(fatwaPath)) {
  fatwaMurabahah = fs.readFileSync(fatwaPath, 'utf-8');
}

// API Endpoint proxy untuk DeepSeek AI mengisi template baku akad dengan rujukan Fatwa DSN-MUI
app.post('/api/generate-akad', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const { akadData, validationResult } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key DeepSeek belum dikonfigurasi di Environment Variable Railway (DEEPSEEK_API_KEY).' 
    });
  }

  try {
    const prompt = `Anda adalah Notaris Hukum Syariah dan Asisten AI Koperasi. 
Tugas Anda adalah mengisi dan mengganti seluruh variabel/placeholder identitas (Nama, NIK, Alamat, Pekerjaan/Jabatan), Objek Barang, Harga Pokok, Margin, Uang Muka, Angsuran, Jangka Waktu, Saksi-Saksi, dan Tanggal pada TEMPLATE BAKU AKAD MURABAHAH resmi berikut berdasarkan DATA INPUT TRANSAKSI yang diberikan, serta memastikan seluruh ketentuannya patuh penuh pada FATWA DSN-MUI NO. 04/DSN-MUI/IV/2000.

PENTING DAN WAJIB DIPATUHI:
1. SAMAKAN FORMAT DAN STRUKTUR TEPAT 100% SAMA PERSIS DENGAN TEMPLATE BAKU (Susunan judul, paragraf pembuka, kalimat hukum, urutan pasal, ayat, dalil Al-Qur'an/Hadits, rincian hitungan, dan penutup). Jangan menambah atau mengurangi struktur kalimat hukum baku.
2. JANGAN MENGGUNAKAN SIMBOL MARKDOWN SAMA SEKALI (seperti **, *, __, #, dll). Tuliskan dokumen dalam TEKS POLOS (plain text) yang bersih.
3. Ganti seluruh nilai variabel/identitas Pihak Pertama, Pihak Kedua, Objek Barang, Nilai Finansial, Saksi-Saksi, dan Tanggal secara akurat sesuai Data Input Transaksi Baru.
4. Pastikan klausul Akad Murabahah mencakup dan mematuhi rujukan resmi Fatwa DSN-MUI berikut:

=== REFERENSI FATWA DSN-MUI NO: 04/DSN-MUI/IV/2000 TENTANG MURABAHAH ===
${fatwaMurabahah}

=== TEMPLATE BAKU AKAD ===
${templateMurabahah}

=== DATA INPUT TRANSAKSI BARU ===
Jenis Akad: ${akadData.tipeAkad}
Pihak Pertama (Penjual/Koperasi): ${akadData.pihakPertama} (Jabatan: ${akadData.jabatanPihakPertama || 'Pengurus'}, Alamat: ${akadData.alamatPihakPertama || 'Kantor Koperasi'})
Pihak Kedua (Pembeli/Anggota): ${akadData.pihakKedua} (NIK: ${akadData.nikPihakKedua || '-'}, Pekerjaan: ${akadData.pekerjaanPihakKedua || '-'}, Alamat: ${akadData.alamatPihakKedua || '-'})
Objek Barang: ${akadData.namaBarang} (Spesifikasi: ${akadData.spesifikasi || '-'})
Harga Pokok: Rp ${parseFloat(akadData.hargaBeli || 0).toLocaleString('id-ID')}
Margin Keuntungan: Rp ${parseFloat(akadData.margin || 0).toLocaleString('id-ID')}
Uang Muka: Rp ${parseFloat(akadData.uangMuka || 0).toLocaleString('id-ID')}
Tenor: ${akadData.tenor || 12} Bulan
Saksi 1: ${akadData.saksi1 || 'Saksi I Koperasi'}
Saksi 2: ${akadData.saksi2 || 'Saksi II Koperasi'}
Tanggal Akad: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
          { role: 'system', content: 'Anda adalah Notaris Kontrak Syariah Koperasi yang memproses template akad hukum baku berdasarkan Fatwa DSN-MUI No. 04. Hasilkan output berupa TEKS POLOS tanpa format markdown (tanpa tanda bintang ** atau *).' },
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

// API Endpoint proxy untuk Chatbot Konsultan / Pengawas Syariah AI (RAG dengan Fatwa DSN-MUI)
app.post('/api/chat-syariah', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const { messages } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key belum dikonfigurasi di Environment Variable Railway (DEEPSEEK_API_KEY).' 
    });
  }

  const systemPrompt = `Kamu adalah AI Konsultan dan Pengawas Syariah (Sharia Advisory Assistant) yang berperan sebagai mitra diskusi bagi praktisi hukum, akademisi, pelaku industri keuangan syariah, dan masyarakat umum. Kamu memiliki pemahaman mendalam tentang fiqh muamalah, hukum ekonomi syariah, dan regulasi keuangan syariah di Indonesia.

PENTING: JIKA PENGGUNA BERTANYA TENTANG AKAD MURABAHAH, KETENTUAN UANG MUKA (URBUN), JAMINAN, DERAJANJI, ATAU PENUNDAAN PEMBAYARAN, JAWABANMU HARUS BERDASARKAN TEKS RESMI FATWA DSN-MUI NO. 04/DSN-MUI/IV/2000 BERIKUT:

=== SUMBER KNOWLEDGE FATWA DSN-MUI NO: 04/DSN-MUI/IV/2000 TENTANG MURABAHAH ===
${fatwaMurabahah}

## IDENTITAS DAN PERAN

Kamu bertindak layaknya seorang Dewan Pengawas Syariah (DPS) atau konsultan syariah berpengalaman yang bisa:
1. Menjelaskan konsep dan struktur akad syariah secara akurat dan mudah dipahami berdasarkan Fatwa DSN-MUI resmi.
2. Menganalisis kesesuaian suatu skema transaksi atau produk dengan prinsip syariah.
3. Memberikan rekomendasi struktur akad yang paling tepat untuk kebutuhan pembiayaan tertentu.
4. Mengidentifikasi potensi masalah syariah (gharar, riba, maysir, jahalah) dalam suatu skema.
5. Merujuk secara presisi pada poin-poin Fatwa DSN-MUI No. 04 (Ketentuan Umum, Ketentuan kepada Nasabah, Jaminan, Utang, Penundaan Pembayaran, Bangkrut).

## CARA MERESPONS

1. Sertakan rujukan pasal/poin spesifik dari Fatwa DSN-MUI No. 04/DSN-MUI/IV/2000 jika ditanya tentang Murabahah (misalnya: "Berdasarkan Fatwa DSN-MUI No. 04 Poin Kedua Ayat 7 tentang Uang Muka...").
2. Gunakan penomoran biasa (1., 2., 3.) atau strip (-).
3. PENTING: JANGAN MENGGUNAKAN SIMBOL MARKDOWN SAMA SEKALI (seperti bintang *, cetak tebal **, miring *, hashtag ###, atau garis ---). Tuliskan balasan dalam TEKS POLOS (plain text) yang bersih.`;

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

// API Endpoint untuk mengambil seluruh data akad terpanen
app.get('/api/contracts', (req, res) => {
  const contracts = loadContracts();
  res.json({ contracts });
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
    contracts[existingIndex] = contract;
  } else {
    contracts.unshift(contract);
  }

  saveContracts(contracts);
  res.json({ success: true, contracts });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Akad Syariah (AKADIN) berjalan di port ${PORT}. Menyimpan data di ${dataDir}`);
});
