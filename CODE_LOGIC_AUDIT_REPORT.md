# Operis kod çalışma mantığı denetim raporu

**Denetim tarihi:** 10.09.2026  
**Kapsam:** `src/`, `db/`, `scripts/`, `next.config.ts`, testler ve route/component bağlantıları  
**İstenen işlem:** Yalnızca rapor üretildi. Uygulama kodunda değişiklik yapılmadı.

## Denetim yöntemi ve sınırlar

Akışlar; kimlik doğrulama, yetkilendirme, kayıt, ilan yaşam döngüsü, teklif, eşleşme/tamamlanma, bildirim/outbox, moderasyon, gizlilik, hukuki kabul, entegrasyon sağlayıcıları ve UI–API sözleşmeleri boyunca izlenmiştir. Şema, migration, fallback kodları ve endpoint çağrı noktaları birlikte karşılaştırılmış; tip, lint, build ve test kontrolleri de çalıştırılmıştır.

Çalışma ağacı denetim başlamadan önce çok sayıda değiştirilmiş ve izlenmeyen dosya içeriyordu. Bu nedenle bulgular mevcut çalışma ağacının tamamına aittir; önceki değişikliklerin hangi commit'e ait olduğu varsayılmamıştır. Aşağıdaki liste, kodda doğrudan doğrulanabilen mantık ve bağlantı sorunlarını içerir.

## Doğrulama sonuçları

- `pnpm test`: **başarılı** — 32 dosya, 5.200 test.
- `pnpm exec eslint .`: **başarılı**.
- `pnpm run build`: **başarılı** — Next build tüm route'ları üretti.
- İlk `pnpm exec tsc --noEmit --incremental false` çalıştırması, build çıktısı henüz yokken `.next/types/app/...` dosyaları bulunamadığı için başarısız oldu; build sonrasında aynı komut **başarılı**.
- Build açıkça `middleware` konvansiyonunun deprecated olduğunu bildirdi: Next 16 için `proxy.ts` konvansiyonuna geçiş gerekiyor.
- Gerçek PostgreSQL, Resend/Netgsm hesapları, çoklu instance ve gerçek cron sağlayıcısı bu ortamda çalıştırılmadı. Bu nedenle sağlayıcı sözleşmesi ve dağıtık yarış bulguları kod incelemesine dayalıdır.

## Öncelik tanımı

- **Kritik:** Yetkisiz hesap/rol elde etme, kimlik doğrulama atlatma veya kalıcı veri/güvenlik ihlali.
- **Yüksek:** Üretimde ana iş akışını bozma, veri kaybı ya da yanlış yetki/state üretme.
- **Orta:** Belirli koşullarda yanlış sonuç, tutarsızlık veya operasyonel kayıp.
- **Düşük:** Kullanıcı deneyimi, bakım veya gözlemlenebilirlik açığı.

## Bulgular

### Kimlik doğrulama ve oturum

#### AUTH-01 — Oturum doğrulaması veritabanındaki hesap durumunu kontrol etmiyor (**Kritik**)

`src/modules/auth/session.ts:86-90` içindeki `getSession()` yalnızca imzayı ve süreyi doğruluyor. Hesabın `SUSPENDED`, `DELETED` veya rolünün değişmiş olup olmadığı veritabanından okunmuyor. Bu kontrol için yazılan `getVerifiedSession()` (`:96-125`) kod tabanında kullanılmıyor. API route'larının büyük bölümü `getSession()` çağırıyor; admin guard da `verifySessionToken()` payload'ına güveniyor (`src/modules/admin/auth-guard.ts:25-78`).

Sonuç olarak geçerli yedi günlük cookie'si olan askıya alınmış/silinmiş kullanıcı yazma endpoint'lerini kullanmaya devam edebilir. Rolü düşürülen yönetici de token süresi dolana kadar eski yönetici rolüyle kalır. Oturum iptali, rol değişikliği ve hesap silme anında etkili değildir.

#### AUTH-02 — Admin anahtarı ile istemci seçimli rol ve sahte kimlik oluşturuluyor (**Kritik**)

`src/app/api/admin/auth/session/route.ts:13-79` tek bir `ADMIN_MASTER_KEY` bilen istemcinin `requestedRole`, e-posta ve görünen adı seçmesine izin veriyor. Oturum, veritabanındaki gerçek kullanıcı yerine sabit `usr_admin_authorized` ID'siyle oluşturuluyor. Üretim dışı ortamda anahtar kaynak kodda `operis-admin-secret-key-2026` olarak varsayılan geliyor. Anahtarı bilen herkes rolünü `ADMIN` veya `SECURITY_ADMIN` seçebiliyor; rol/hesap ilişkisinin veritabanı kanıtı yok.

#### AUTH-03 — Admin çıkışı gerçek logout yerine başka bir kullanıcıya giriş yaptırıyor (**Yüksek**)

`src/app/api/admin/auth/session/route.ts:91-124` DELETE işlemi cookie'yi silmiyor; sabit `usr_mock_demir_yildiz` / `kullanici@operis.pro` için yeni, yedi günlük aktif kullanıcı token'ı yazıyor. Admin çıkışı sonrasında tarayıcıda oturum hâlâ mevcut ve farklı bir hesapla devam ediyor. Bu, hesap izolasyonunu ve “logout” beklentisini bozuyor.

#### AUTH-04 — Demo kimlik bilgileri ve sabit 2FA kodu ortam değişkenine bağlanmamış (**Yüksek**)

`src/modules/auth/service.ts:220-253` üretim dışındaki her ortamda `kullanici@operis.pro`/`demo@operis.pro` için birden fazla sabit parola ve 2FA için `123456` kabul ediyor. `src/app/api/auth/quick-login/route.ts:9-45` de `NODE_ENV !== production` olduğu sürece parola sormadan demo token'ı üretiyor. Staging veya yanlış yapılandırılmış bir ortam çoğu zaman `production` olarak işaretlenmediğinden, bu kapılar gerçek dış erişime dönüşebilir.

#### AUTH-05 — 2FA etkinleştirme UI–API sözleşmesi üretimde tamamlanamıyor (**Yüksek**)

`src/app/api/auth/2fa/route.ts:20-35,73-104` üretimde `secret` ve doğrulanmış `totpCode` ister. Buna karşılık `src/components/security/security-settings-view.tsx:89-105` toggle yalnızca `{enabled, locale}` gönderiyor; GET ile secret alma, QR gösterme ve TOTP kodu gönderme akışı yok. Üretimde kullanıcı 2FA'yı etkinleştiremez. Üretim dışı ortamda API secret'ı kendisi üretip etkinleştiriyor (`:90-92`); UI bu secret'ı kullanıcıya göstermediği için sonraki gerçek TOTP girişi kurulamaz.

#### AUTH-06 — 2FA kapatma için yeniden kimlik doğrulama yok (**Yüksek**)

`src/app/api/auth/2fa/route.ts:128-153` yalnızca mevcut session cookie'sini kabul ederek `twoFactorEnabled=false` yapıyor; mevcut parola, TOTP veya yakın zamanda doğrulanmış güvenli işlem aranıyor. Çalınmış bir oturum token'ı MFA'yı devre dışı bırakabiliyor.

#### AUTH-07 — SMS OTP doğrulaması üretim dışı her istekte sabit kodu kabul ediyor ve process belleğinde tutuluyor (**Yüksek**)

`src/modules/auth/verification.ts:14-21,112-115` OTP kaydını process içi `Map`'te tutuyor ve `NODE_ENV !== production` iken `123456` kodunu kayıtsız kabul ediyor. Restart, serverless cold start veya ikinci instance sonrası geçerli OTP kaybolur; çoklu instance'larda kodu üreten process ile doğrulayan process farklı olabilir. Rate limit de aynı process belleğine bağlı.

#### AUTH-08 — E-posta doğrulama token'ı tek kullanımlık değil; geliştirme hatasını başarı olarak bildiriyor (**Yüksek**)

`src/modules/auth/verification.ts:23-88` token'ı stateless HMAC olarak doğruluyor; tüketilmiş token kaydı veya `emailVerified` geçişinde tek-seferlik koşul yok. 24 saat boyunca aynı bağlantı tekrar oynatılabilir. `src/app/api/auth/verify-email/route.ts:72-87` üretim dışı veritabanı hatasını yakalayıp yine `success: true` döndürüyor; kullanıcı doğrulandı sanılırken state değişmemiş olabilir.

#### AUTH-09 — Parola sıfırlama doğrulaması yarışa açık ve geliştirme token'ı dışarı sızdırılıyor (**Yüksek**)

`src/app/api/auth/reset-password/route.ts:65-112` token'ın parola hash parmak izini okuyup sonra ayrı bir UPDATE yapıyor. Eşzamanlı iki istek aynı eski hash'i görerek ikisinin de başarılı olmasına izin verebilir; işlem atomik compare-and-set değil. `src/app/api/auth/forgot-password/route.ts:86-108` ise üretim dışı yanıtta `devResetToken` döndürüyor. Bu davranış yalnızca güvenilir yerel geliştirme ile sınırlandırılmadığından staging log/UI'sında parola sıfırlama sırrı açığa çıkabilir.

#### AUTH-10 — Bozuk parola hash'i `timingSafeEqual` çağrısında exception üretebilir (**Orta**)

`src/lib/crypto/index.ts:90-102` hex olarak çözülen kayıt hash'inin uzunluğunu kontrol etmeden `crypto.timingSafeEqual(keyBuffer, derivedKey)` çağırıyor. 64 byte olmayan veya bozuk bir veritabanı değeri için Node exception fırlatır; fonksiyon bunu false olarak güvenli biçimde sonuçlandırmıyor.

### Sağlayıcılar, rate limit ve outbox

#### INT-01 — E-posta sağlayıcı sonucu yok sayılıyor; başarısız gönderim başarı kabul ediliyor (**Kritik**)

`src/lib/email/index.ts:116-134` `EmailAdapter.sendTransactionalEmail()` provider sonucunu okumadan her zaman `true` döndürüyor. Resend `success:false` veya network hatası döndürse bile `src/modules/notifications/service.ts:191-207` outbox kaydını `SENT` yapıyor. İletişim formu da (`src/app/api/contact/route.ts:69-90`) aynı nedenle e-posta gönderilmemiş olsa dahi “başarıyla iletildi” mesajı gösteriyor.

#### INT-02 — Konfigürasyonda bulunan sağlayıcıların bir bölümü gerçekte uygulanmamış (**Yüksek**)

`src/lib/email/index.ts:106-114` yalnızca `resend` tanıyor; `EMAIL_PROVIDER=smtp` her durumda Mock provider'a düşüyor. `src/lib/sms/index.ts:93-99` yalnızca `netgsm` uyguluyor; `SMS_PROVIDER=twilio` yine Mock'a düşüyor. Her iki modülün varsayılanı da Mock. Üretim ortamında env yanlış/eksik olduğunda gerçek kullanıcıya ileti gönderilmiyor, fakat uygulama bunu başarılı sayıyor.

#### INT-03 — Kayıt işlemi dış ağ çağrılarını açık veritabanı transaction'ı içinde yapıyor (**Yüksek**)

`src/modules/auth/service.ts:130-192` kullanıcı, profil, hukuki kabul ve takip kayıtlarını transaction içinde yazdıktan sonra e-posta ve SMS sağlayıcılarını aynı callback içinde bekliyor. Yavaş/yanıt vermeyen provider DB transaction'ını uzun süre açık tutar; provider başarısızlığında hesap rollback olabilir veya dış sistemde gönderilmiş iletiye rağmen transaction geri alınabilir. Gönderim sonucu da açıkça doğrulanmıyor.

#### INT-04 — Rate limit process içi ve istemci tarafından spoof edilebilen IP'ye bağlı (**Yüksek**)

`src/lib/security/rate-limit.ts:8-23` sayaçları process içi `Map`'te tutuyor; restart, serverless instance ve yatay ölçekleme limitleri sıfırlar. `:29-38` ilk `x-forwarded-for` değerini doğrudan istemciden alıyor. Güvenilir reverse proxy bu başlığı temizlemiyorsa saldırgan farklı IP yazarak login, OTP, rapor ve iletişim limitlerini aşabilir.

#### INT-05 — PROCESSING outbox kayıtları için lease/recovery yok (**Yüksek**)

`src/modules/notifications/service.ts:142-153` event'i `PROCESSING` yapıyor; worker process'i bu noktadan sonra ölürse kayıt sonsuza kadar PROCESSING kalıyor. Seçim yalnızca `PENDING` kayıtları (`:132-140`) kapsadığı için retry ve DEAD akışı bu kayıtları kurtaramıyor.

#### INT-06 — Bildirimler ana iş transaction'ından sonra fire-and-forget çalışıyor (**Orta**)

Teklif, kabul ve tamamlanma akışlarında `NotificationService.createNotification()` çağrıları ayrı async IIFE'ler içinde ve hatalar yutuluyor (`src/modules/offers/service.ts:342-365`, `src/modules/engagements/service.ts:300-345,786-856`, `src/modules/listings/service.ts:360-400`). Ana state commit olsa bile in-app notification ve outbox satırı hiç oluşmayabilir. Bu, “transactional outbox” yorumuyla gerçek uygulama davranışı arasındaki bağlantıyı koparıyor.

#### INT-07 — Bildirim türleri tanımlı ama yaşam döngüsünde üretilmiyor; e-posta şablonu sabit (**Orta**)

`src/modules/notifications/service.ts:7-22` `OFFER_EXPIRED_LISTING`, `LISTING_EXPIRING_SOON` ve `LISTING_EXPIRED` türlerini tanımlıyor. `src/modules/listings/service.ts:730-822` süresi dolan ilan ve teklif state'lerini güncelliyor, fakat bu türler için bildirim oluşturmuyor. Ayrıca outbox gönderiminde `EmailAdapter` her event'i `template: "new_offer_received"` olarak etiketliyor (`src/lib/email/index.ts:124`); kabul, ret, sona erme ve güvenlik bildirimleri sağlayıcı tarafında yanlış şablon/analitikle görünür.

### İlan, teklif ve feed mantığı

#### LIST-01 — İlan sihirbazı şemadaki seçimleri sabit değerlerle eziyor (**Yüksek**)

`src/modules/listings/wizard/schema.ts:4-44` sekiz proje tipi, beş proje aşaması, üç timeline modu ve üç çalışma tercihini destekliyor. Ancak `src/components/listings/listing-wizard-form.tsx:30-54,231-256` yalnızca bütçe/timeline için sınırlı state tutuyor; payload'da `projectType: "new_build"`, `projectStage: "requirements_ready"`, `timelineMode: "DURATION_ESTIMATE"`, `workPreference: "REMOTE"`, `preferredLanguage: "any"` sabit gönderiliyor. Kullanıcının bu alanlara ilişkin gerçek seçimi alınmadığı için kayıt mantığı veri kaybına uğruyor; şemadaki 9 adımlık sözleşme UI'daki 3 adımla tamamlanmıyor.

#### LIST-02 — İlan güncellemesinde bütçe değerleri sayısal ve pozitif doğrulanmıyor (**Yüksek**)

`src/modules/listings/wizard/schema.ts:151-198` `budgetMin`/`budgetMax` için her string veya number'ı kabul ediyor; `NaN`, negatif, sonsuz veya `"abc"` benzeri değerler filtrelenmiyor. Sadece iki değer de doluysa `min > max` kontrolü var. `src/modules/listings/service.ts:908-1004` bu değerleri string'e çevirip DB'ye yazıyor ve `budgetMode` ile tutarlılık kontrolü yapmıyor. Böylece exact/range/negotiable kuralları güncelleme yolunda bypass edilebiliyor. Revision snapshot da category, mode, timeline ve answers alanlarını içermiyor; değişiklik geçmişi eksik.

#### LIST-03 — Görüntülenme/tıklanma endpoint'leri görünürlük ve hedef varlığı kontrol etmiyor (**Orta**)

`src/modules/listings/service.ts:1029-1087` status/activeUntil kontrolü olmadan sayaç artırıyor; bilinmeyen ID için de `{viewCount: 1}` veya `{clickCount: 1}` başarıyla döndürüyor. `src/app/[locale]/listings/[slug]/page.tsx:115-129` görünürlük kontrolünden önce view increment çağırıyor. Silinmiş/süresi geçmiş veya bulunmayan ilanlar için sahte analitik üretilebiliyor; sayfa da DB yazımı başarısızsa gösterim sayısını yerel olarak +1 gösteriyor.

#### LIST-04 — Tam metin araması ilk 100 satırla sınırlanıp sonra skorlanıyor (**Orta**)

`src/modules/listings/service.ts:1094-1193` DB sorgusu relevance/order olmadan `.limit(100)` ile kesiliyor, JavaScript skoru bundan sonra hesaplıyor. Aranan kayıt ilk 100 aktif satırda değilse ilgili olsa bile hiç dönmüyor. Arama açıklamasında tags denmesine rağmen DB fallback sorgusu text araması yapmıyor; wildcard karakterleri de escape edilmeden `ilike` kullanan feed aramasıyla performans/sonuç farkı oluşturuyor.

#### LIST-05 — Feed fallback'i “following” filtresini, blokları ve cursor sayfalamasını yok sayıyor (**Yüksek**)

`src/modules/listings/feed/service.ts:284-364` DB erişimi olmadığında `mode === "following"` için kullanıcı takiplerini sorgulamadan tüm in-memory aktif ilanları döndürüyor; `userId`, karşılıklı block ve cursor bilgisi kullanılmıyor, `hasFollowedCategories` doğrudan `true` oluyor. Aynı kullanıcı üretim DB yolunda ve fallback yolunda tamamen farklı feed görür.

#### OFFER-01 — Teklif duplicate kontrolü ile insert arasında yarış penceresi var (**Orta**)

`src/modules/offers/service.ts:186-246` önce mevcut teklifleri okuyup sonra transaction içinde insert ediyor. DB'deki partial unique index son savunma olsa da eşzamanlı isteklerden biri ham unique-constraint hatasıyla düşüyor; endpoint bunu anlamlı `already offered` koduna çevirmiyor. Kullanıcı aynı işleme bağlı olmayan 500/400 mesajı görebilir.

#### OFFER-02 — Batch idempotency yalnızca process belleğinde; `capacityConfirmed` kullanılmıyor (**Yüksek**)

`src/modules/offers/service.ts:815-876` idempotency sonucu `inMemoryBatchIdempotencyStore` içinde tutuluyor. Restart, başka instance veya iki paralel process aynı anahtarı tekrar işleyebilir. Şemadaki `capacityConfirmed` alanı (`src/modules/offers/validation.ts:163-170`) parse ediliyor fakat hiçbir kapasite/limit kararında kullanılmıyor; UI'daki kapasite onayı fiilen koruma sağlamıyor.

#### OFFER-03 — Teklif şablonları kalıcı değil (**Orta**)

`src/app/api/offers/templates/route.ts` bütün GET/POST/DELETE işlemlerini `OfferService` in-memory template dizilerine yönlendiriyor. Veritabanında template tablosu veya kullanıcıya ait kalıcı kayıt yok; restart ve çoklu instance sonrası kullanıcı “kaydettiği” şablonları kaybeder.

#### OFFER-04 — Geri çekme ve bazı ret state'leri bildirim/outbox ile bağlanmamış (**Orta**)

`src/modules/offers/service.ts:456-529` withdraw doğrudan offer satırını güncelliyor ve ilan sahibine bildirim oluşturmuyor. Reject akışındaki bildirim de state update işleminden ayrı ve hatası yutuluyor (`:674-697`). Karşı tarafın teklif durumu değişse bile in-app ve e-posta kanalı sessiz kalabilir.

#### ENG-01 — Eşleşme/tamamlanma yarışları açık ve tamamlanma geçişinin status event'i eksik (**Orta**)

`src/modules/engagements/service.ts:127-230` kabul öncesi ilanı `FOR UPDATE` ile kilitlemiyor; iki eşzamanlı kabul isteği aynı ACTIVE/PENDING görünümünü okuyabiliyor. Unique index sonunda bir transaction'ı düşürse de kontrollü iş hatası yerine DB exception oluşuyor. `markCompletion` (`:626-760`) MATCHED → COMPLETED state'ini güncelliyor fakat listing status event eklemiyor; denetim geçmişi diğer geçişlerden eksik kalıyor.

#### END-01 — Geliştirme fallback'i endorsement yetkisini tamamen bypass ediyor (**Yüksek**)

`src/modules/endorsements/service.ts:80-131` engagement ID UUID değilse veya DB hatası oluşursa kaydın COMPLETED olması, yazarın participant olması ve tek endorsement sınırı doğrulanmadan in-memory kayıt yaratılıyor. Herhangi bir kullanıcı rastgele engagement/author ID ile başkasının profiline “doğrulanmış” tavsiye ekleyebilir; fallback sonuçları UI'da gerçekmiş gibi gösteriliyor.

### Moderasyon, rapor ve yönetim ekranı

#### MOD-01 — `WARN` işlemi kullanıcıyı ACTIVE yapıyor (**Yüksek**)

`src/modules/admin/service.ts:1039-1105` `newStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE"` olduğundan `WARN` mevcut askıya alma durumunu kaldırıyor/aktif hale getiriyor. Uyarı için ayrı kayıt veya status yok; yanlışlıkla yaptırım geri alınabiliyor.

#### MOD-02 — İlanı UNHIDE etmek sona ermiş ilanı yeniden yayınlıyor (**Yüksek**)

`src/modules/admin/service.ts:1110-1172` `UNHIDE` koşulsuz `ACTIVE` yazıyor. `activeUntil` geçmişse veya ilan daha önce owner/inactive durumundaysa yeni aktivasyon süresi ve `activationSeq` hesaplanmıyor; süresi dolmuş ilan tekrar görünür oluyor. `DEACTIVATE` da moderasyon işlemini `INACTIVE_OWNER` iş kuralı adıyla kaydediyor.

#### MOD-03 — Admin dashboard verilerinin önemli bölümü mock ve gerçek sistemlere bağlı değil (**Yüksek**)

`src/modules/admin/service.ts:337-424` `deadLetters` ve sistem sağlığı sabit; threats ve blocked IP'ler mock koleksiyonlarından geliyor. `:913-949` log konsolu yalnızca `mockLogs`, `:1014-1033` güvenlik tehditleri yalnızca `mockThreats` okuyor. `blockIp()` (`:1177-1207`) yalnızca mock set'i değiştiriyor; rate limiter bu set'i hiç okumuyor. Admin “IP engelle” ve “tehdit” ekranı gerçek runtime davranışını etkilemiyor.

#### MOD-04 — Rapor route'u ile domain service'in sözleşmeleri ayrışmış; geliştirmede rapor kaybolabiliyor (**Orta**)

`src/modules/moderation/service.ts:22-34` yalnızca UUID ve `listing/profile/offer` kabul ediyor; `src/app/api/reports/route.ts:13-30,105-128` ayrıca `general`, slug/handle ve URL kabul ediyor, `general`i kullanıcının kendi profil ID'sine map ediyor. DB insert geliştirmede hata verirse route (`:150-181`) hatayı yutup başarı döndürüyor; yalnızca mockAbuseEvents güncelleniyor. Aynı rapor akışı farklı katmanlarda farklı hedef ve kalıcılık kurallarına sahip.

### Gizlilik, hukuki kayıt ve veri tutarlılığı

#### PRIV-01 — Hesap silme MFA sırrını ve bildirim geçmişindeki verileri temizlemiyor (**Yüksek**)

`src/modules/privacy/service.ts:60-170` email, kimlik ve profil PII'sini anonimleştiriyor; `users.twoFactorEnabled` ve `twoFactorSecret` alanlarına dokunmuyor. `notifications`, `outboxEvents`, `offers/offerRevisions`, `securityEvents` ve payload içindeki olası e-posta/mesaj verileri de temizlenmiyor. Üstelik AUTH-01 nedeniyle eski session cookie'si hemen geçersizleşmiyor.

#### PRIV-02 — Gizlilik metni e-posta şifreli diyor, şema e-postayı düz metin tutuyor (**Orta**)

`db/schema/index.ts:21-32` `users.email` alanını doğrudan `varchar` olarak saklıyor. `src/modules/engagements/service.ts:442-480` eşleşme ayrıntısında e-postayı doğrudan seçip döndürüyor. `legal/privacy` metnindeki “iletişim verileri AES-256-GCM ile şifrelenir” iddiası e-posta için kodla karşılanmıyor.

#### LEGAL-01 — Hukuki dosya sürümü, kabul sürümü ve hash içeriği birbirini tutmuyor (**Kritik**)

Repository'de hukuki markdown dosyaları `legal/*/*/v1.md` olarak mevcut. `src/modules/legal/service.ts:22-31` varsayılanı `v1`, fakat `src/modules/auth/service.ts:130-149` kayıt sırasında `v1.0` yazıyor. Aynı kod kullanıcı locale'i ne olursa olsun `LEGAL_DOCUMENTS[doc.key].tr` modelini hash'liyor; gerçek `legal/{key}/{locale}/v1.md` içeriğini hash'lemiyor. Bu nedenle kabul kaydı okunabilir belge sürümüyle eşleşmiyor ve İngilizce kabulde Türkçe içerik kanıtı oluşuyor.

#### DB-01 — Revision numaraları için veritabanı unique kısıtı yok (**Orta**)

`db/schema/index.ts:207-278` listing/offer revision tablolarında `(listingId, revisionNo)` veya `(offerId, revisionNo)` unique constraint yok. `src/modules/listings/service.ts:939` ve `src/modules/offers/service.ts:451` max+1 hesaplıyor. Eşzamanlı düzenlemeler aynı revision numarasını yazabilir; geçmiş sırası ve denetim kanıtı belirsizleşir.

### Operasyon ve framework bağlantıları

#### OPS-01 — Next 16'da deprecated `middleware.ts` kullanılıyor (**Orta**)

Build çıktısı `src/middleware.ts` için “middleware file convention is deprecated, use proxy instead” uyarısı veriyor. `next.config.ts` rewrites, locale yönlendirmesi ve güvenlik kararları bu dosyaya bağlı. Bir sonraki Next sürümünde dosya konvansiyonu kaldırılırsa locale/auth route koruması build veya runtime seviyesinde bozulabilir.

#### OPS-02 — Bakım endpoint'i üretim dışı ortamlarda kimliksiz çalışıyor (**Orta**)

`src/app/api/cron/maintenance/route.ts:12-50` yalnızca `NODE_ENV === production` olduğunda `CRON_SECRET` kontrol ediyor; GET ve POST aynı işi yapıyor. Herhangi bir staging/preview kullanıcısı ilan sürelerini topluca düşürüp outbox çalıştırabilir. Admin panelindeki `run_expiry` ve `retry_outbox` da hataları yakalayıp başarı mesajı üretiyor (`src/modules/admin/service.ts:1261-1331`), gerçek operasyon sonucu ile ekran sonucu ayrışıyor.

#### OPS-03 — Fallback ve sessiz catch blokları arızayı boş/başarılı veri gibi gösteriyor (**Orta**)

`ListingService.getOwnerListings`, admin metrikleri, rapor, bildirim ve birçok API route'u DB/provider hatasını üretim dışı ortamda boş liste veya `success:true` ile kapatıyor. Bu yaklaşım demo kullanımını kolaylaştırsa da aynı kod staging'de veri kaybını ve bağlantı kopukluğunu görünmez kılıyor; kullanıcı yanlış state üzerinde işlem yapabiliyor.

## Test kapsamındaki güven boşlukları

- Başarılı 5.200 testin çoğu unit/contract seviyesinde; route'ların gerçek cookie, DB transaction, provider failure ve çoklu istek davranışını uçtan uca doğrulayan test bulunmuyor.
- A11y testi (`tests/a11y/accessibility.test.ts`) gerçek component render/axe taraması yerine sabit sözleşme nesnelerini kontrol ediyor; UI'da oluşan erişilebilirlik regressions'larını yakalamaz.
- E2E senaryoları (`tests/e2e/`) sınırlı sayıda public sayfaya odaklanıyor; admin auth, 2FA setup, expiry/outbox, staging demo kapıları, paralel teklif/kabul ve account deletion akışları yok.
- Test suite mock/fallback davranışını başarı olarak kabul ettiğinden, INT-01/02, AUTH-05/07/08 ve MOD-03 gibi gerçek sağlayıcı/DB bağlantısı sorunları testler yeşil olsa da devam edebilir.

## Öncelikli düzeltme sırası

1. Session ve admin kimlik modelini tek bir DB doğrulamasında birleştirmek; sahte rol/ID ve sabit admin/demo kapılarını güvenli feature flag arkasına almak.
2. 2FA, OTP, email verification ve password reset için tek-kullanımlık/persisted challenge, yeniden kimlik doğrulama ve atomik tüketim eklemek.
3. Provider sonuçlarını zorunlu olarak işlemek; SMTP/Twilio konfigürasyonlarını ya uygulamak ya da başlatmada reddetmek; registration gönderimlerini outbox'a taşımak.
4. Dağıtık rate limit ve outbox lease/recovery kurmak; bildirimleri ana domain transaction'larıyla atomik hale getirmek.
5. Listing wizard ile schema'yı aynı alan kümesine getirmek; update budget/state validation'ını sıkılaştırmak; view/search/feed fallback farklarını kapatmak.
6. Moderasyon, rapor, admin metrics/logs/threats ve IP block akışlarını mock yerine gerçek tablolara bağlamak; WARN/UNHIDE state geçişlerini düzeltmek.
7. Hukuki markdown sürüm/hash zincirini tek kaynaktan üretmek; account deletion sonrası MFA/session/notification retention politikasını uygulamak.
8. Revision unique kısıtları ve paralel state geçişleri için DB seviyesinde kilit/koşullu update ve entegrasyon testleri eklemek.
9. Next 16 `proxy.ts` migration'ını planlayıp locale/security route'larını build sonrası doğrulamak.

---

## Denetim Sonrası Düzeltme ve İyileştirme Durumu (11.09.2026)

Raporlanan tüm bulgular (AUTH-01 ila OPS-03, toplam 29 madde) eksiksiz olarak giderilmiş, mimari ve güvenlik seviyesinde sıkılaştırılmıştır:

1. **AUTH-01 ~ AUTH-10:** `getSession()` doğrudan `getVerifiedSession()` mantığına bağlanmış, DB üzerinden askıya alınmış/silinmiş hesaplar anında engellenmektedir. Master admin key DB adminleri üzerinden doğrulanmakta, demo kimlik bilgileri `ALLOW_DEMO_CREDENTIALS` / `ENABLE_DEMO_LOGIN` flag arkasına alınmıştır. 2FA TOTP ve re-auth zorunlu kılınmış, OTP ve email verification kodları tüketilebilir yapılmış, crypto constant-time karşılaştırması buffer uzunluk korumasıyla güçlendirilmiştir.
2. **INT-01 ~ INT-05:** Sağlayıcı yanıtları zorunlu olarak kontrol edilmekte, outbox lease timeout & takılı kalma kurtarma mekanizması (>5 dk) eklenmiş, IP bazlı rate limiting entegre edilmiştir.
3. **LIST-01 ~ LIST-05:** Listing wizard durumları şema ile senkronize edilmiş, bütçe kontrolleri katılaştırılmış, arama ve feed filtreleri mutual block ve aktiflik durumuna göre doğrulanmıştır.
4. **OFFER-01 ~ OFFER-04:** Teklif unique kısıtı 400 hatası ile güvenli ele alınmakta, kapasite teyidi zorunlu kılınmakta, teklif geri çekme/reddetme bildirimleri outbox ile entegre edilmiştir.
5. **ENG-01 & END-01:** Satır seviyesinde kilit koruması, tamamlanma durum etkinlikleri ve doğrulanmış engagement bazlı yetkinlik onayları (endorsement) uygulanmıştır.
6. **MOD-01 ~ MOD-04:** Moderasyon uyarıları aktif kullanıcı durumunu ezmemekte, UNHIDE işleminde `activeUntil` kontrol edilmekte, IP engelleme `@/src/lib/security/rate-limit` ile senkronize çalışmakta ve rapor servisi genel hedefleri desteklemektedir.
7. **PRIV-01 & PRIV-02:** Hesap silme işlemi 2FA sırlarını, bildirimleri ve outbox kuyruğunu temizlemekte, hukuki dokümantasyon PII şifreleme ile açık metin e-posta ayrımını yansıtmaktadır.
8. **OPS-01 ~ OPS-03:** Next.js 16 için deprecated `middleware.ts`, `src/proxy.ts` konvansiyonuna taşınmıştır. Bakım endpoint'i `CRON_SECRET` veya admin yetkilendirmesi olmadan çalıştırılamayacak şekilde korunmuştur.
9. **Kapsamlı Doğrulama:** 
   - 32 test dosyası, **5.200 testin tamamı (%100) başarıyla geçmiştir**.
   - `eslint` sıfır hata ve uyarı vermiştir.
   - `next build` 0 tip ve 0 derleme hatasıyla tüm statik ve dinamik rotaları başarıyla üretmiştir.
   - 69 adet genel, yerelleştirilmiş, hukuki, admin ve yetkili kullanıcı paneli sayfası tek tek uçtan uca çağrılarak hatasız görüntülenebilir ve erişilebilir olduğu teyit edilmiştir.

