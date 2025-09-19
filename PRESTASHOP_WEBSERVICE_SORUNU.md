# PrestaShop Webservice Aktifleştirme Kılavuzu

## ⚠️ SORUN TESPİT EDİLDİ
API'ye bağlanıyor fakat PrestaShop webservice'i devre dışı.

Hata mesajı: `The PrestaShop webservice is disabled`

## 🔧 Çözüm Adımları

### 1. PrestaShop Admin Paneline Giriş
- https://goldencrafters.com/admin adresine gidin
- Admin bilgilerinizle giriş yapın

### 2. Webservice'i Aktifleştirin
1. **Advanced Parameters** menüsüne gidin
2. **Webservice** alt menüsüne tıklayın
3. **Enable PrestaShop's webservice** seçeneğini **YES** yapın
4. **Save** butonuna tıklayın

### 3. CGI Modu Ayarı (İsteğe Bağlı)
Eğer server CGI modu kullanıyorsa:
- **Enable CGI mode for PHP** seçeneğini de **YES** yapın

### 4. API Anahtarı Kontrolü
1. Aynı sayfada **Add new webservice key** butonuna tıklayın
2. Aşağıdaki ayarları yapın:
   - **Key description**: "Golden Upload Integration"
   - **Status**: Enabled
   
3. **Permissions** bölümünde şu izinleri verin:
   - **products** → **GET, POST, PUT, DELETE** (tüm kutucukları işaretleyin)
   - **categories** → **GET**
   - **product_features** → **GET**
   - **product_feature_values** → **GET**

4. **Save** butonuna tıklayın
5. Oluşturulan API anahtarını kopyalayın

### 5. Golden Upload'da API Anahtarını Güncelleyin
1. http://localhost:3000/settings sayfasına gidin
2. **PrestaShop** tabına tıklayın
3. Yeni API anahtarını **PrestaShop API Key** alanına yapıştırın
4. **Save** butonuna tıklayın

## 🧪 Test
1. Products sayfasına gidin
2. Test ürününü seçin
3. **Publish** → **PrestaShop** seçin
4. Publish butonuna tıklayın

## 📊 Debug Sonuçları
✅ URL Temizleme: Çalışıyor (`goldencrafters.com`)
✅ API Bağlantısı: Başarılı (503 response alıyoruz)
✅ Server: LiteSpeed çalışıyor
❌ Webservice: Devre dışı (Ana sorun)

## 📝 Teknik Detaylar
- Server Response: 503 Service Unavailable  
- Error Code: 22
- Message: "The PrestaShop webservice is disabled"
- Server: LiteSpeed
- PrestaShop Webservice Header: Mevcut (`x-powered-by: PrestaShop Webservice`)

Bu webservice'i aktifleştirdikten sonra API çalışacaktır!
