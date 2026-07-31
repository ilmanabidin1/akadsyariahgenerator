const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint proxy untuk DeepSeek AI menggunakan Environment Variable DEEPSEEK_API_KEY dari Railway
app.post('/api/generate-akad', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  const { akadData, validationResult } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key DeepSeek belum dikonfigurasi di Environment Variable Railway (DEEPSEEK_API_KEY).' 
    });
  }

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

// Fallback route untuk SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Akad Syariah berjalan di port ${PORT}`);
});
