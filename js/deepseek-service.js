/**
 * DeepSeek AI Service Module
 * Menghubungkan aplikasi web dengan DeepSeek API untuk penyusunan redaksi akad syariah otomatis.
 * Dilengkapi dengan Fallback Mock Engine jika API Key belum dipasang.
 */

const DeepSeekService = {
  apiKeySettingKey: 'deepseek_api_key',

  getApiKey() {
    return localStorage.getItem(this.apiKeySettingKey) || '';
  },

  setApiKey(key) {
    localStorage.setItem(this.apiKeySettingKey, key.trim());
  },

  /**
   * Menghasilkan teks redaksi akad menggunakan DeepSeek AI (atau Fallback jika API Key kosong)
   */
  async generateAkadClause(akadData, validationResult) {
    const apiKey = this.getApiKey();

    // Jika API Key dikonfigurasi, panggil endpoint API resmi DeepSeek
    if (apiKey) {
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: `Anda adalah pakar Hukum Ekonomi Syariah dan Notaris Kontrak Syariah Koperasi. 
Tugas Anda adalah membuat klausul akad syariah yang baku, elegan, legal, dan sesuai Fatwa DSN-MUI berdasarkan data input dan hasil validasi rukun/syarat.`
              },
              {
                role: 'user',
                content: `Buatkan redaksi klausul ijab qabul dan pasal-pasal kesepakatan untuk akad ${akadData.tipeAkad} berikut:
Data Transaksi: ${JSON.stringify(akadData)}
Hasil Audit Syariah: ${JSON.stringify(validationResult)}`
              }
            ],
            temperature: 0.3
          })
        });

        if (response.ok) {
          const json = await response.json();
          return json.choices[0].message.content;
        } else {
          console.warn("DeepSeek API Response Error, falling back to Intelligent Mock Engine", await response.text());
        }
      } catch (err) {
        console.error("DeepSeek API connection failed:", err);
      }
    }

    // Fallback Simulator (Smart Local Redaksi Generator)
    return this.generateSmartMockDraft(akadData);
  },

  /**
   * Generator Teks Akad Lokal (Fallback cerdas tanpa butuh API Key langsung)
   */
  generateSmartMockDraft(data) {
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    if (data.tipeAkad === 'Murabahah') {
      const hargaBeli = parseFloat(data.hargaBeli || 0).toLocaleString('id-ID');
      const margin = parseFloat(data.margin || 0).toLocaleString('id-ID');
      const totalHarga = (parseFloat(data.hargaBeli || 0) + parseFloat(data.margin || 0)).toLocaleString('id-ID');
      const angsuran = Math.round((parseFloat(data.hargaBeli || 0) + parseFloat(data.margin || 0)) / parseInt(data.tenor || 1)).toLocaleString('id-ID');

      return `BISMILLAHIRRAHMANIRRAHIM

AKAD JUAL BELI MURABAHAH
Nomor: AKD/MRB/${Date.now().toString().slice(-6)}

Pada hari ini ${today}, bertempat di Kantor Koperasi Konsumen Al Firdaus, kami yang bertanda tangan di bawah ini:

1. KOPERASI KONSUMEN AL FIRDAUS, berkedudukan di Bandung, dalam hal ini diwakili oleh ${data.pihakPertama || 'Pengurus Koperasi'} bertindak untuk dan atas nama Koperasi, selanjutnya disebut PIHAK PERTAMA (PENJUAL).
2. ${data.pihakKedua || 'Nama Nasabah/Anggota'}, bertempat tinggal di ${data.alamat || 'Alamat Anggota'}, No. KTP: ${data.nik || '320xxxxxxxxxxxx'}, bertindak atas nama pribadi, selanjutnya disebut PIHAK KEDUA (PEMBELI).

Para Pihak sepakat mengikatkan diri dalam Akad Jual Beli Murabahah dengan ketentuan sebagai berikut:

PASAL 1: OBJEK JUAL BELI
PIHAK PERTAMA menjual kepada PIHAK KEDUA dan PIHAK KEDUA membeli dari PIHAK PERTAMA berupa:
Barang: ${data.namaBarang || 'Barang/Aset'}
Spesifikasi: ${data.spesifikasi || 'Sesuai pesanan dan nota pembelian'}

PASAL 2: HARGA POKOK, MARGIN, DAN HARGA JUAL
1. PIHAK PERTAMA memberitahukan secara jujur bahwa Harga Pokok Barang adalah Rp ${hargaBeli}.
2. Margin Keuntungan (Keuntungan Penjual) yang disepakati adalah Rp ${margin}.
3. Total Harga Jual Murabahah adalah sebesar Rp ${totalHarga}.

PASAL 3: JANGKA WAKTU DAN ANGSURAN
PIHAK KEDUA berjanji membayar Total Harga Jual secara mengangsur selama ${data.tenor || 12} bulan, dengan nilai angsuran sebesar Rp ${angsuran} per bulan.

PASAL 4: PERNYATAAN IJAB QABUL
PIHAK PERTAMA menyatakan: "Saya jual barang tersebut kepada Anda dengan total harga Rp ${totalHarga} secara angsuran."
PIHAK KEDUA menyatakan: "Saya terima dan beli barang tersebut dengan total harga Rp ${totalHarga} sesuai ketentuan di atas."`;
    } 
    
    else if (data.tipeAkad === 'Qardh') {
      const pinjaman = parseFloat(data.jumlahPinjaman || 0).toLocaleString('id-ID');
      const admin = parseFloat(data.biayaAdmin || 0).toLocaleString('id-ID');

      return `BISMILLAHIRRAHMANIRRAHIM

AKAD PINJAMAN KEBAJIKAN (AL-QARDH)
Nomor: AKD/QRD/${Date.now().toString().slice(-6)}

Pada hari ini ${today}, telah disepakati Akad Al-Qardh antara:

1. KOPERASI KONSUMEN AL FIRDAUS (PIHAK PERTAMA / MUQRIDH)
2. ${data.pihakKedua || 'Nama Anggota'} (PIHAK KEDUA / MUQTARIDH)

PASAL 1: PINJAMAN POKOK
PIHAK PERTAMA memberikan pinjaman kebajikan (Qardh) kepada PIHAK KEDUA uang sebesar Rp ${pinjaman}.

PASAL 2: BIAYA OPERASIONAL RIIL (RI'AYAH)
PIHAK KEDUA dibebankan biaya administrasi operasional riil pencetakan dokumen sebesar Rp ${admin}. Biaya ini tidak dihitung dari persentase keuntungan.

PASAL 3: PENGEMBALIAN PINJAMAN
PIHAK KEDUA berkewajiban mengembalikan pinjaman pokok sebesar Rp ${pinjaman} (Tanpa Tambahan Riba) pada jatuh tempo tanggal ${data.jatuhTempo || 'Sesuai Jadwal'}.

PASAL 4: IJAB QABUL
Ijab: "PIHAK PERTAMA menyerahkan uang pinjaman Qardh sebesar Rp ${pinjaman}."
Qabul: "PIHAK KEDUA menerima pinjaman tersebut dan berjanji mengembalikannya utuh tanpa tambahan."`;
    }

    else { // Mudharabah
      const modal = parseFloat(data.jumlahModal || 0).toLocaleString('id-ID');
      const nisbahP = data.nisbahPengelola || 60;
      const nisbahM = data.nisbahPemodal || 40;

      return `BISMILLAHIRRAHMANIRRAHIM

AKAD KERJASAMA BAGI HASIL (MUDHARABAH)
Nomor: AKD/MDR/${Date.now().toString().slice(-6)}

Antara KOPERASI KONSUMEN AL FIRDAUS (Shahibul Maal / Pemodal) dan ${data.pihakKedua || 'Nama Pengelola'} (Mudharib / Pengelola Usaha).

PASAL 1: MODAL USAHA (RA'S AL-MAL)
PIHAK PERTAMA menyetorkan modal usaha sebesar Rp ${modal} untuk digunakan dalam usaha: ${data.bidangUsaha || 'Usaha Perdagangan/Jasa'}.

PASAL 2: NISBAH BAGI HASIL
Keuntungan bersih usaha (Net Profit) akan dibagi dengan persentase Nisbah:
- Mudharib (Pengelola Usaha): ${nisbahP}%
- Shahibul Maal (Koperasi): ${nisbahM}%

PASAL 3: TANGGUNG JAWAB KERUGIAN
Kerugian finansial ditanggung oleh Shahibul Maal, kecuali jika disebabkan oleh kelalaian (Tafrith) atau pelanggaran dari Mudharib.`;
    }
  }
};
