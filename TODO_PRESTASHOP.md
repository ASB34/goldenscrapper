# TODO: PrestaShop Attribute Management

## 🎯 ANA HEDEF
PrestaShop'ta varyantlı ürünleri proper combination products olarak yayınlamak

## 📝 YAPILACAKLAR

### 1. Helper Functions Oluştur
- [ ] `ensureAttributeGroup()` - Attribute group kontrolü/oluşturma
- [ ] `ensureAttribute()` - Attribute kontrolü/oluşturma  
- [ ] `createCombinations()` - Product combinations oluşturma

### 2. API Endpoints Test Et
- [ ] `/api/product_options` - GET/POST
- [ ] `/api/product_option_values` - GET/POST
- [ ] `/api/combinations` - GET/POST

### 3. Variant Mapping Logic
- [ ] Etsy variant structure → PrestaShop attributes mapping
- [ ] Price conversion (XAU) for each combination
- [ ] SKU generation for combinations

### 4. Main Flow Update
- [ ] Product type "combination" set et
- [ ] Combinations creation'ı main flow'a entegre et
- [ ] Error handling ve logging ekle

### 5. Test Senaryosu
- [ ] 1 variant group, 2 options ile test
- [ ] PrestaShop admin'de combination görünümü kontrol
- [ ] Pricing doğruluğu kontrol

## ⚡ ÖNCELİK SIRASI
1. **Yüksek**: `ensureAttributeGroup()` fonksiyonu
2. **Yüksek**: `ensureAttribute()` fonksiyonu  
3. **Orta**: `createCombinations()` fonksiyonu
4. **Orta**: Main flow integration
5. **Düşük**: Advanced error handling

## 📍 BAŞLANGIÇ NOKTASI
`src/app/api/publish/route.ts` - `publishToPrestaShopDirect()` fonksiyonu

## 🔄 İTERATİF YAKLAŞIM
1. Önce sadece 1 attribute group ile test
2. Sonra multiple options ekle
3. Son olarak multiple variant groups ekle

## 📊 SUCCESS CRITERIA
- [ ] PrestaShop admin'de product type "combinations" 
- [ ] Variants tab'ında options görünür
- [ ] Her option'ın kendi fiyatı var
- [ ] Stock management per combination çalışıyor
