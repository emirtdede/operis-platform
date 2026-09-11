# Operis KMS & Sıfır Kesinti PII Anahtar Rotasyonu Kılavuzu

## 1. Genel Bakış
Operis platformunda kişisel veriler (PII - Ad, Soyad, Telefon Numarası, Doğum Tarihi) veritabanında açık metin olarak asla saklanmaz. Tüm veriler **AES-256-GCM** algoritması ve rastgele üretilen 96-bitlik benzersiz IV'ler ile şifrelenir.

Platform, sıfır kesintiyle (Zero-Downtime) şifreleme anahtarlarının döndürülmesini (Key Rotation) native olarak destekler.

---

## 2. Çift Anahtarlı Şifre Çözme Mimarisi
- `PII_ENCRYPTION_KEY_CURRENT`: Yeni yazılan tüm verilerin şifrelenmesinde kullanılan birincil anahtar (256-bit Hex).
- `PII_ENCRYPTION_KEY_PREVIOUS`: Rotasyon geçiş sürecinde eski verilerin okunabilmesini sağlayan ikincil anahtar (256-bit Hex).

`decryptPii` fonksiyonu şifrelenmiş veriyi açarken önce `CURRENT` anahtarı dener; eğer kimlik doğrulama etiketi (GCM Auth Tag) başarısız olursa otomatik ve şeffaf olarak `PREVIOUS` anahtarı dener.

---

## 3. Anahtar Rotasyon Prosedürü (4 Adım)

### Adım 1: Yeni Anahtar Üretimi
Kriptografik olarak güvenli 32 baytlık (256-bit) yeni bir hex anahtarı üretin:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Adım 2: Ortam Değişkenlerinin Güncellenmesi
1. Mevcut `PII_ENCRYPTION_KEY_CURRENT` değerini `PII_ENCRYPTION_KEY_PREVIOUS` değişkenine atayın.
2. Yeni ürettiğiniz anahtarı `PII_ENCRYPTION_KEY_CURRENT` değişkenine atayın.
3. Uygulamayı yeniden başlatın. Bu aşamada eski veriler `PREVIOUS` ile okunabilir, yeni veriler `CURRENT` ile şifrelenir.

### Adım 3: Arka Plan Veri Tabanı Yeniden Şifreleme İşi
Veritabanındaki eski anahtarla şifreli tüm kayıtları yeni anahtara geçirmek için rotasyon scriptini çalıştırın:
```bash
pnpm tsx scripts/rotate-pii-keys.ts
```

### Adım 4: Eski Anahtarın Emekliye Ayrılması
Veritabanındaki tüm kayıtlar başarıyla güncellendikten sonra `PII_ENCRYPTION_KEY_PREVIOUS` ortam değişkenini kaldırabilir veya boş bırakabilirsiniz.

---

## 4. Donanım Güvenlik Modülü (HSM / KMS) Entegrasyonu
Üretim ortamlarında (AWS KMS, Google Cloud KMS, HashiCorp Vault):
- Anahtarlar doğrudan sunucu ortam değişkenlerinde saklanmak yerine KMS üzerinde Envelope Encryption modeliyle saklanabilir.
- Her ortam ayağa kalkışında KMS API'si üzerinden anahtarlar çözülür ve RAM'de şifrelenmiş bellek alanında tutulur.
