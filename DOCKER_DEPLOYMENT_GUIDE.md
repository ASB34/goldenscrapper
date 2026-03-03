# Docker & Portainer Implementasyon Tamamlandı ✅

Uygulamanızı kendi sunucunuzda Portainer üzerinden çalıştırmak için tüm gerekli dosyalar eklenmiştir.

## 📋 Eklenen Dosyalar

### 1. **docker-compose.yml**
- PostgreSQL veritabanı servisi
- Next.js uygulaması servisi
- Port yapılandırması: `3005:3000`
- Network konfigürasyonu
- Health checks
- Persistent volume'ler

### 2. **Dockerfile**
- Multi-stage build (optimize edilmiş)
- Node.js 20-Alpine temeli
- Production dependencies
- Health check dahil

### 3. **init.sql**
- PostgreSQL veritabanı şema oluşturma
- Tüm gerekli tablo tanımları:
  - `products` - Ürün bilgileri
  - `publishing_logs` - Yayın geçmişi
  - `user_settings` - Kullanıcı ayarları
  - `xau_rates` - Altın fiyatları
  - `users` - Kullanıcı hesapları
- Otomatik indeksler ve constraints

### 4. **PORTAINER_SETUP.md**
- Adım adım Portainer deployment rehberi
- Ortam değişkenleri listesi
- Network/DNS konfigürasyonu
- Nginx reverse proxy örneği
- Troubleshooting rehberi

### 5. **.env.example**
- PostgreSQL konfigürasyonu
- Application secrets
- API key placeholders

## 🚀 Deployment Adımları (Portainer'da)

### Adım 1: Stack Oluşturma
```
Portainer → Stacks → Add Stack
Stack Name: goldenupload
```

### Adım 2: docker-compose.yml Yapıştır
Repository'den `docker-compose.yml` dosyasının içeriğini yapıştırın.

### Adım 3: Ortam Değişkenleri
Aşağıdaki kritik değişkenleri belirleyin:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=goldenupload

NEXTAUTH_URL=http://upload.goldencrafters.com:3005
NEXT_PUBLIC_APP_URL=http://upload.goldencrafters.com:3005

ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword456!

JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
NEXTAUTH_SECRET=your-nextauth-secret

OPENAI_API_KEY=your-openai-key
METALS_API_KEY=your-metals-api-key
```

### Adım 4: Deploy
- "Deploy the stack" butonuna tıklayın
- Konteynerler otomatik başlayacak

## 🌐 Domain Konfigürasyonu

### Nginx Reverse Proxy
`upload.goldencrafters.com`'ı sunucunuza proxy edin:

```nginx
server {
    listen 80;
    server_name upload.goldencrafters.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/HTTPS (Recommended)
Let's Encrypt ile HTTPS şifrelemeyi aktifleştirin:

```bash
# Certbot kullanarak
certbot certonly -d upload.goldencrafters.com

# Nginx konfigürasyonunda
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/upload.goldencrafters.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/upload.goldencrafters.com/privkey.pem;
```

## 📊 Portainer'da Yönetim

### Konteynereri İzleme
- **goldenupload-db**: PostgreSQL (5432 portunda)
- **goldenupload-app**: Next.js (3000 portunda)

### Logs Görüntüleme
```
Containers → goldenupload-app → Logs
```

### Veritabanı Yönetimi
```
Containers → goldenupload-db → Exec Console

psql -U postgres -d goldenupload
```

### Stack Yeniden Başlatma
```
Stacks → goldenupload → Stop
Stacks → goldenupload → Start
```

## 💾 Backup & Restore

### PostgreSQL Backup
```bash
docker exec goldenupload-db pg_dump -U postgres goldenupload > backup.sql
```

### PostgreSQL Restore
```bash
docker exec -i goldenupload-db psql -U postgres goldenupload < backup.sql
```

## 🔐 Üretim Güvenliği Checklist

- [ ] Güvenli şifreler atayın (admin, database)
- [ ] HTTPS/SSL sertifikası kurun
- [ ] Firewall kurallarını ayarlayın (80, 443, 3005)
- [ ] Backups otomatikleştirin
- [ ] Portainer alertleri ayarlayın
- [ ] Resource limits tanımlayın
- [ ] Log rotation konfigüre edin

## 📝 Veritabanı Migrasyonu (Supabase → PostgreSQL)

Var olan Supabase verileriniz varsa:

1. Supabase'den export edin
2. PostgreSQL'e import edin:
```bash
docker exec -i goldenupload-db psql -U postgres goldenupload < data.sql
```

## ✅ Doğrulama

Deployment sonrası kontrol listesi:

1. **Konteynerler çalışıyor mu?**
   ```bash
   docker ps | grep goldenupload
   ```

2. **Uygulama erişilebilir mi?**
   ```bash
   curl http://localhost:3005
   ```

3. **Veritabanı bağlı mı?**
   ```bash
   docker logs goldenupload-app | grep "connected"
   ```

4. **Domain yönlendirmesi çalışıyor mu?**
   ```bash
   curl http://upload.goldencrafters.com:3005
   ```

## 🆘 Sorun Giderme

### App servisi başlamıyorsa
```bash
docker logs goldenupload-app
```

### Veritabanına bağlanamıyor
- PostgreSQL çalışıyor mu: `docker ps | grep postgres`
- Şifreler doğru mu: `docker logs goldenupload-db`

### Domain erişim sorunu
- DNS ayarlarını kontrol edin
- Firewall portlarını açın: `sudo ufw allow 80,443,3005`

## 📚 Başka Kaynaklar

- [Docker Compose Dokümantasyonu](https://docs.docker.com/compose/)
- [Portainer Dokümantasyonu](https://docs.portainer.io/)
- [PostgreSQL Docker Images](https://hub.docker.com/_/postgres)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## 🔄 Güncellemeleri Deploy Etme

Yeni sürümleri deploy etmek için:

1. **GitHub'dan pull edin**
   ```bash
   git pull origin master
   ```

2. **Portainer'da update edin**
   - Stacks > goldenupload > Pull latest image
   - Redeployed stack

3. **Veya manuel rebuild**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

---

**Sorunlar veya sorularınız varsa, GitHub issues sekmesine yazabilirsiniz.**

**Son güncelleme:** 2026-03-03
**Version:** 1.0.0 (Docker ready)
