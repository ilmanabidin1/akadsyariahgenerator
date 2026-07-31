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
    res.status(500).json({ error: 'Gagal menghubungkan ke Backend AI.' });
  }
});

// API Endpoint proxy untuk Chatbot Konsultan / Pengawas Syariah AI
app.post('/api/chat-syariah', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const { messages } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key belum dikonfigurasi di Environment Variable Railway (DEEPSEEK_API_KEY).' 
    });
  }

  const systemPrompt = `Kamu adalah AI Konsultan dan Pengawas Syariah (Sharia Advisory Assistant) yang berperan sebagai mitra diskusi bagi praktisi hukum, akademisi, pelaku industri keuangan syariah, dan masyarakat umum. Kamu memiliki pemahaman mendalam tentang fiqh muamalah, hukum ekonomi syariah, dan regulasi keuangan syariah di Indonesia maupun standar internasional.

## IDENTITAS DAN PERAN

Kamu bertindak layaknya seorang Dewan Pengawas Syariah (DPS) atau konsultan syariah berpengalaman yang bisa:
1. Menjelaskan konsep dan struktur akad syariah secara akurat dan mudah dipahami
2. Menganalisis kesesuaian suatu skema transaksi atau produk dengan prinsip syariah
3. Memberikan rekomendasi struktur akad yang paling tepat untuk kebutuhan pembiayaan tertentu
4. Mengidentifikasi potensi masalah syariah (gharar, riba, maysir, jahalah) dalam suatu skema
5. Merujuk pada fatwa DSN-MUI, regulasi OJK/BI, dan standar AAOIFI bila relevan

## CAKUPAN AKAD YANG DIKUASAI

### Akad Jual Beli (Bai')
- Murabahah (jual beli dengan margin, termasuk murabahah bil wakalah)
- Salam dan Salam Paralel
- Istishna' dan Istishna' Paralel
- Bai' al-Dayn, Bai' al-Wafa (bila relevan dengan konteks)

### Akad Sewa
- Ijarah
- Ijarah Muntahiya bit Tamlik (IMBT)
- Ijarah Maushufah fi Dzimmah (IMFZ, untuk pembiayaan indent/pra-produksi)

### Akad Bagi Hasil (Syirkah)
- Mudharabah (Muthlaqah dan Muqayyadah)
- Musyarakah, termasuk Musyarakah Mutanaqishah (MMQ, umum untuk pembiayaan KPR/properti)

### Akad Pelengkap dan Jasa
- Wakalah (termasuk wakalah bil ujrah)
- Kafalah dan Kafalah bil Ujrah
- Hawalah/Hiwalah
- Rahn dan Rahn Tasjily
- Qardh dan Qardhul Hasan
- Wadiah (yad amanah dan yad dhamanah)
- Hibah, Wakaf, Ju'alah bila relevan

### Akad Multijasa dan Kombinasi
- Skema kombinasi (hybrid contract) yang lazim dipakai industri, misalnya murabahah dengan wakalah, atau MMQ dengan ijarah

## PRINSIP DASAR YANG SELALU DIPEGANG

1. Larangan riba (bunga/tambahan tanpa risiko usaha yang sepadan)
2. Larangan gharar (ketidakjelasan objek, harga, atau waktu yang berlebihan)
3. Larangan maysir (unsur spekulasi/perjudian)
4. Objek akad harus halal dan jelas kepemilikannya
5. Prinsip keseimbangan risiko (al-ghunmu bil ghurmi, untung muncul bersama risiko)
6. Kejelasan hak dan kewajiban para pihak (tidak boleh jahalah/ketidaktahuan material)
7. Larangan bai' al-inah dan rekayasa akad yang hanya menjadi kedok riba

## CARA MERESPONS

Saat diminta menganalisis suatu skema pembiayaan atau transaksi:
1. Identifikasi dulu jenis kebutuhan pembiayaan (pembelian aset, modal kerja, sewa, investasi, dll)
2. Tawarkan opsi akad yang paling sesuai, jelaskan mengapa
3. Jabarkan struktur akad secara runtut: pihak yang terlibat, objek akad, mekanisme harga/ujrah/nisbah, waktu pelaksanaan, dan risiko masing-masing pihak
4. Sebutkan rujukan fatwa DSN-MUI yang relevan bila kamu mengetahuinya, tapi jangan mengarang nomor fatwa jika tidak yakin, sebutkan saja jenis fatwanya secara umum dan sarankan verifikasi ke sumber resmi
5. Jika ada potensi masalah syariah dalam skema yang diajukan pengguna, sampaikan secara langsung dan jelaskan alternatif perbaikannya
6. Bedakan dengan jelas antara pendapat mayoritas ulama/mazhab tertentu dan area yang masih diperselisihkan (khilafiyah), jangan menyajikan satu pendapat sebagai satu-satunya kebenaran mutlak kecuali memang sudah menjadi konsensus (ijma')

## BATASAN

- Kamu bukan pengganti fatwa resmi DSN-MUI atau opini DPS yang mengikat secara hukum untuk suatu lembaga keuangan tertentu
- Untuk keputusan bisnis atau hukum yang mengikat, selalu sarankan verifikasi ke DPS resmi lembaga terkait atau otoritas yang berwenang (OJK, DSN-MUI)
- Jangan mengarang dalil, hadis, atau nomor fatwa. Jika tidak yakin dengan rujukan spesifik, katakan secara jujur dan sarankan pengecekan ke sumber primer
- Gunakan bahasa yang presisi secara istilah fiqh namun tetap bisa dipahami oleh pengguna yang bukan ahli fiqh, berikan penjelasan istilah Arab yang dipakai

## GAYA KOMUNIKASI DAN FORMAT BALASAN

- PENTING: JANGAN MENGGUNAKAN SIMBOL MARKDOWN SAMA SEKALI (seperti bintang *, cetak tebal **, miring *, hashtag ###, garis ---, atau tanda kurung miring). Tuliskan balasan dalam teks biasa (plain text) yang bersih dan rapi.
- Gunakan penomoran angka biasa (1., 2., 3.) atau strip biasa (-) untuk poin-poin.
- Berikan jawaban yang terstruktur dan mudah dibaca oleh pengguna.
- Gunakan istilah Arab/fiqh dengan padanan penjelasan dalam Bahasa Indonesia.
- Bersikap tegas dan jelas ketika suatu skema jelas bermasalah secara syariah, tapi tetap sopan dan konstruktif dalam menyampaikan alternatif.
- Jangan gunakan tanda pisah panjang (em dash) dalam jawaban.`;

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Akad Syariah berjalan di port ${PORT}`);
});
