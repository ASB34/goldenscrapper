# PrestaShop Entegrasyonu Kılavuzu

## Genel Bakış
Bu kılavuz goldencrafters.com PrestaShop mağazanızı Golden Upload uygulamasıyla entegre etmenizi gösterir.

## PrestaShop API Anahtarı Oluşturma

### 1. Admin Paneline Giriş
- https://goldencrafters.com/admin adresine gidin
- Admin bilgilerinizle giriş yapın

### 2. Webservice Ayarları
1. **Advanced Parameters** > **Webservice** menüsüne gidin
2. **Enable webservice** seçeneğini aktif edin
3. **Save** butonuna tıklayın

### 3. API Anahtarı Oluşturma
1. **Webservice** sayfasında **Add new webservice key** butonuna tıklayın
2. Aşağıdaki ayarları yapın:
   - **Key**: Otomatik oluşturulacak (veya kendiniz belirleyebilirsiniz)
   - **Key description**: "Golden Upload Integration"
   - **Status**: Enabled
   
3. **Permissions** bölümünde aşağıdaki izinleri verin:
   - **products** → **GET, POST, PUT, DELETE** (tüm izinler)
   - **categories** → **GET** (kategoriler için okuma)
   - **product_features** → **GET** (ürün özellikleri için)
   - **product_feature_values** → **GET** (ürün özellik değerleri için)
   - **images** → **POST** (resim yükleme için)

4. **Save** butonuna tıklayın

### 4. API Anahtarını Kopyalama
- Oluşturulan API anahtarını kopyalayın
- Bu anahtarı Golden Upload uygulamasında kullanacaksınız

## Golden Upload Ayarları

### 1. Settings Sayfasına Giriş
- http://localhost:3000/settings adresine gidin
- **PrestaShop** tabına tıklayın

### 2. Bilgileri Girme
1. **Store URL**: `https://goldencrafters.com`
2. **PrestaShop API Key**: Yukarıda oluşturduğunuz API anahtarını girin
3. Her iki alanı da **Save** butonlarıyla kaydedin

## Ürün Yayınlama

### 1. Ürün Hazırlama
- Products sayfasında ürününüzü AI ile işleyin
- İçeriğin İngilizce çevirisinin tamamlandığından emin olun

### 2. PrestaShop'a Yayınlama
1. **Publish** butonuna tıklayın
2. **PrestaShop** seçeneğini işaretleyin
3. **Publish** butonuna tıklayın

### 3. Sonuç Kontrolü
- Başарılı olursa PrestaShop admin panelinden ürünü kontrol edebilirsiniz
- Katalog > Ürünler bölümünde yeni ürün görünecektir

## PrestaShop API Endpoint'leri

Uygulama aşağıdaki PrestaShop API endpoint'lerini dener:
- `https://goldencrafters.com/api/products`
- `https://goldencrafters.com/products`
- `https://goldencrafters.com/api/product`
- `https://goldencrafters.com/product`

## Ürün Bilgileri

Aşağıdaki bilgiler PrestaShop'a aktarılır:
- **Ürün Başlığı**: AI ile yeniden yazılmış İngilizce başlık
- **Açıklama**: AI ile yeniden yazılmış İngilizce açıklama
- **Fiyat**: Etsy'den alınan fiyat bilgisi
- **Kategori**: Varsayılan kategori (ID: 2)
- **Durumu**: Aktif
- **Stok Durumu**: Mevcut

## Sorun Giderme

### API Anahtarı Sorunları
- API anahtarının doğru kopyalandığından emin olun
- Webservice'in aktif olduğunu kontrol edin
- Gerekli izinlerin verildiğini kontrol edin

### Bağlantı Sorunları
- Store URL'nin doğru olduğunu kontrol edin
- HTTPS kullanımını tercih edin
- Firewall ayarlarını kontrol edin

### Ürün Oluşturma Sorunları
- Ürünün AI ile işlendiğinden emin olun
- Fiyat bilgisinin mevcut olduğunu kontrol edin
- PrestaShop'ta varsayılan kategori (ID: 2) var mı kontrol edin

## Teknik Detaylar

### API Format
- PrestaShop XML formatını kullanır
- Basic Authentication ile güvenlik
- Otomatik endpoint tespit

### Ürün Mapping
```xml
<product>
  <name><language id="1">Ürün Başlığı</language></name>
  <description><language id="1">Ürün Açıklaması</language></description>
  <price>Fiyat</price>
  <active>1</active>
  <id_category_default>2</id_category_default>
</product>
```

### Güvenlik
- API anahtarları şifrelenmiş olarak saklanır
- HTTPS bağlantı tercih edilir
- Basic Authentication kullanılır

## Destek

Sorun yaşarsanız:
1. Console log'larını kontrol edin
2. PrestaShop error log'larını kontrol edin  
3. API anahtarı izinlerini yeniden kontrol edin
4. Store URL'nin doğruluğunu kontrol edin
