# AutoPulse — 0 TL Bütçeli, Bilgisayar Kapalıyken Bile Çalışan Tam Otomatik Gelir Sistemi

Bu proje; senin bilgisayarın tamamen kapalıyken bile **GitHub'ın ücretsiz bulut sunucularında her 6 saatte bir otomatik uyanıp çalışan**, global pazardan (Dolar bazlı) pasif gelir üretmek üzere tasarlanmış **Programatik SEO + Affiliate + Hazır Dijital Ürün** motorudur.

---

## Sistemin İçinde Neler Var?
1. **Tam Otomatik Veri Motoru (`scripts/run-autopilot.mjs`):**
   - Her 6 saatte bir ücretsiz/anahtarsız global API'lerden anlık **indirimli oyun/yazılım fırsatlarını**, **trend olan yapay zeka (AI) araçlarını** ve **global uzaktan (remote) iş ilanlarını** çeker.
   - Her fırsat için Google'da indekslenecek zengin SEO sayfaları (`public/item/*.html`), `sitemap.xml`, `robots.txt` ve RSS (`feed.xml`) üretir.
2. **Hazır Satılacak Dijital Ürün (`digital-product/2026-AI-Automation-Mega-Vault.md` & `public/digital-product-vault.html`):**
   - Sıfırdan ürün yazmana gerek kalmasın diye 55+ kopyala-yapıştır AI prompt ve otomasyon şablonu içeren İngilizce dijital ürün senin için hazırlandı.
   - Tek yapman gereken bunu PDF olarak kaydedip **Gumroad**'a ücretsiz yüklemek ($19 fiyatla).
3. **10 Dakikada Kurulum Asistanı (`public/setup-guide.html`):**
   - Tarayıcıda açıp kendi Gumroad/Affiliate linklerini yazarak hazır `config.json` dosyanı tek tıkla indirebileceğin görsel kurulum sayfası.
4. **Ücretsiz Bulut Zamanlayıcısı (`.github/workflows/daily-autopilot.yml`):**
   - Sunucu kirası **0 TL**, domain zorunluluğu **0 TL**, yapay zeka API maliyeti **0 TL**.

---

## Kur ve Hiç Dokunma — Adım Adım Başlangıç (10 Dakika)

### 1. Adım: Hazır Dijital Ürününü Gumroad'a Yükle (Ücretsiz)
1. Bilgisayarında önizlemeyi açmak için proje klasöründe şu komutu çalıştırabilir veya doğrudan dosyayı tarayıcıda açabilirsin:
   - Doğrudan aç: `public/digital-product-vault.html`
   - Veya yerel sunucu ile: `npm run serve` → `http://127.0.0.1:4173/digital-product-vault.html`
2. Sağ üstteki **"Export / Save as PDF"** butonuna basıp **PDF olarak kaydet**.
3. [Gumroad.com](https://gumroad.com) üzerinde ücretsiz hesap aç, **New Product → Digital Product** diyerek bu PDF'i yükle ve fiyatını **$19** yap.
4. Sana verilen Gumroad ürün linkini kopyala.

### 2. Adım: Linklerini `config.json` İçine Koy
- `public/setup-guide.html` dosyasını tarayıcıda aç (`http://127.0.0.1:4173/setup-guide.html`), Gumroad linkini (ve varsa Amazon / Instant Gaming / G2A / A-Ads ID'lerini) kutucuklara girip **"config.json Dosyasını İndir"** butonuna tıkla.
- İndirdiğin `config.json` dosyasını proje ana klasöründeki `config.json` ile değiştir.

### 3. Adım: GitHub'a Yükle ve Sonsuza Kadar Unut
1. [GitHub.com](https://github.com) üzerinde ücretsiz bir hesap aç ve `autopulse-passive-engine` adında **Public** (Herkese Açık — ücretsiz sınırsız Actions & Pages için) yeni bir repository oluştur.
2. Bu klasördeki tüm dosyaları GitHub repona yükle (`git init`, `git add .`, `git commit -m "init"`, `git push` veya GitHub web arayüzünden).
3. GitHub reponda sırasıyla şu iki ayarı yap:
   - **Settings → Pages → Source:** `GitHub Actions` seç.
   - **Settings → Actions → General → Workflow permissions:** `Read and write permissions` seç ve **Save** de.
4. **Actions** sekmesine girip **"AutoPulse 24/7 Cloud Autopilot"** iş akışını ilk kez **Run workflow** ile başlat.
5. Tebrikler! Artık bilgisayarını kapatabilirsin. Sistem her 6 saatte bir bulutta kendiliğinden çalışacak, yeni sayfalar üretecek ve siteni güncelleyecektir.

---

## İsteğe Bağlı: Trafiği Otopilota Bağlama (0 TL)
- **Google & Bing İndeksleme:** Siten canlıya geçtikten sonra `https://kullanici-adin.github.io/autopulse-passive-engine/sitemap.xml` adresini **Google Search Console** ve **Bing Webmaster Tools**'a bir kez ekle.
- **Otomatik Telegram Kanalı:** Bir Telegram Bot Token ve Kanal ID'sini GitHub reponda `Settings → Secrets and variables → Actions` altına `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` olarak eklersen, sistem her çalıştığında en iyi fırsatları otomatik olarak Telegram kanalına da atar.
- **RSS Otopaylaşım:** Sitenin `feed.xml` adresini ücretsiz **IFTTT** veya **Make.com** hesabına bağlayarak X (Twitter), Pinterest veya Discord'a otomatik paylaşım kurabilirsin.

---

## Yerel Test Komutları
```bash
# Verileri çekip siteyi (public/) yeniden üretmek için:
npm run autopilot

# Siteyi bilgisayarında önizlemek için:
npm run serve
```
