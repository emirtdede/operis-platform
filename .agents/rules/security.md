# Güvenlik ve Gizli Anahtar (Secret & API Key) Politikası

1. **ASLA Kod İçine API Anahtarı Yazma:**
   - Hiçbir API key, token, veritabanı şifresi veya gizli kimlik bilgisi kaynak koda, scriptlere, test dosyalarına veya dökümantasyona doğrudan (hardcoded) yazılamaz.
   - Varsayılan (fallback) değer olarak dahi gerçek veya canlıya benzer token yazılamaz (process.env.KEY || 're_...' KESİNLİKLE YASAKTIR).

2. **Yalnızca Ortam Değişkenleri (.env / .env.local):**
   - Tüm gizli anahtarlar istisnasız process.env üzerinden okunmalı, anahtar bulunamazsa kod güvenli bir hata mesajıyla sonlandırılmalıdır.
   - Gerçek değerler yalnızca .gitignore tarafından korunan .env.local dosyasında veya Vercel panelinde tutulmalıdır.

3. **Otomatik Tarama ve Sızıntı Önleme:**
   - Kod değişikliklerinde gizli anahtar kalıpları kontrol edilmeli, asla git geçmişine sızdırılmamalıdır.
