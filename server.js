const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load template Murabahah dari file extracted_template.txt (atau fallback jika belum di-extract)
let templateMurabahah = "";
const templatePath = path.join(__dirname, 'extracted_template.txt');
if (fs.existsSync(templatePath)) {
  templateMurabahah = fs.readFileSync(templatePath, 'utf-8');
}

// API Endpoint proxy untuk DeepSeek AI mengisi template baku akad
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
Tugas Anda adalah mengisi dan mengganti seluruh variabel/placeholder identitas (Nama, NIK, Alamat, Pekerjaan/Jabatan), Objek Barang, Harga Pokok, Margin, Uang Muka, Angsuran, Jangka Waktu, Saksi-Saksi, dan Tanggal pada TEMPLATE BAKU AKAD MURABAHAH resmi berikut berdasarkan DATA INPUT TRANSAKSI yang diberikan.

PENTING DAN WAJIB DIPATUHI:
1. SAMAKAN FORMAT DAN STRUKTUR TEPAT 100% SAMA PERSIS DENGAN TEMPLATE BAKU (Susunan judul, paragraf pembuka, kalimat hukum, urutan pasal, ayat, dalil Al-Qur'an/Hadits, rincian hitungan, dan penutup). Jangan menambah atau mengurangi struktur kalimat hukum baku.
2. JANGAN MENGGUNAKAN SIMBOL MARKDOWN SAMA SEKALI (seperti **, *, __, #, dll). Tuliskan dokumen dalam TEKS POLOS (plain text) yang bersih.
3. Ganti seluruh nilai variabel/identitas Pihak Pertama, Pihak Kedua, Objek Barang, Nilai Finansial, Saksi-Saksi, dan Tanggal secara akurat sesuai Data Input Transaksi Baru.

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
          { role: 'system', content: 'Anda adalah Notaris Kontrak Syariah Koperasi yang memproses template akad hukum baku. Hasilkan output berupa TEKS POLOS tanpa format markdown (tanpa tanda bintang ** atau *).' },
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
    res.status(500).json({ error: 'Gagal menghubungkan ke DeepSeek API Backend.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Akad Syariah berjalan di port ${PORT}`);
});
