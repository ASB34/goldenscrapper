# Portainer Docker Compose Configuration for Golden Upload

Portainer üzerinde Golden Upload uygulamasını çalıştırmak için bu adımları takip edin:

## Dosya Yapısı

```
.
├── docker-compose.yml          # Docker Compose konfigürasyonu (Stack olarak kullanılacak)
├── Dockerfile                  # Application Dockerfile
├── init.sql                    # PostgreSQL veritabanı başlatma scripti
├── .env.example                # Environment değişkenleri örneği
```

## Portainer'da Stack Oluşturma Adımları

### 1. Portainer'a Giriş
- Portainer web arayüzüne gidin
- Stacks > Add Stack seçeneğine tıklayın

### 2. Stack Konfigürasyonu

**Stack Name:** `goldenupload`

**Docker Compose YAML:** 
[Aşağıdaki docker-compose.yml içeriğini yapıştırın]

### 3. Ortam Değişkenleri

Portainer'da `.env` değişkenleri ayarlanırken aşağıdaki önemli değişkenleri tanımlayın:

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123          # Güvenli bir şifre belirleyin!
POSTGRES_DB=goldenupload

NEXTAUTH_URL=http://upload.goldencrafters.com:3005
NEXT_PUBLIC_APP_URL=http://upload.goldencrafters.com:3005

ADMIN_USERNAME=admin
ADMIN_PASSWORD=secureAdmin123!         # Güvenli bir şifre belirleyin!

JWT_SECRET=e5472a5376643e9ca20db1e16f0e558c4e823915ca0242440c855a2d0df81556
ENCRYPTION_KEY=8411067307cdc0232e899f85adaad857
NEXTAUTH_SECRET=cbb1ce9c53c733c7ee446ffd9a0963733421c76d4765dcf475fdc1e151b9cc37

OPENAI_API_KEY=your-openai-api-key
METALS_API_KEY=your-metals-api-key
```

### 4. Portainer Stack Deploy Ayarları

- **Prune services:** Unchecked
- **Continue on deployment error:** Checked
- **Compatibility mode:** Checked (eğer gerekirse)

### 5. Stack Deploy

"Deploy the stack" butonuna tıklayın

## Network Konfigürasyonu

### DNS/Reverse Proxy Ayarları (Nginx/Traefik)

Domain `upload.goldencrafters.com`'ı sunucunuza yönlendirin:

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

SSL (HTTPS) için Let's Encrypt kullanmanız önerilir:

```nginx
server {
    listen 443 ssl http2;
    server_name upload.goldencrafters.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

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

## Portainer'da Stack Yönetimi

### Stack İzleme
- Portainer > Stacks > goldenupload
- Container durumlarını görüntüleyin
- Logs sekmesinden uygulamayı monitör edin

### Çalışan Konteynerler
- `goldenupload-db`: PostgreSQL veritabanı (bağlantı noktası: 5432)
- `goldenupload-app`: Next.js uygulaması (bağlantı noktası: 3005)

### Stack Yeniden Başlatma
- Portainer > Stacks > goldenupload > Stop/Start

### Stack Güncelleme
- Yeni bir sürümü deploy etmek için:
  - Stack > Pull latest image
  - Redeployed stack

## Veritabanı Yönetimi

### PostgreSQL'e Bağlanma

Portainer'dan:
1. Containers > goldenupload-db
2. Exec Console açın
3. PostgreSQL komutlarını çalıştırın:

```bash
psql -U postgres -d goldenupload
```

### Başlangıç Verileri

`init.sql` otomatik olarak veritabanını başlatır:
- Tabloları oluşturur
- Gerekli indeksleri ayarlar
- Örnek XAU oranlarını ekler

## Troubleshooting

### 1. App servisi başlamıyorsa
- Logs kontrol edin: `docker logs goldenupload-app`
- DATABASE_URL doğruluğunu kontrol edin
- Tüm ortam değişkenlerinin tanımlandığından emin olun

### 2. Veritabanına bağlanamıyor
- PostgreSQL servisi çalışıyor mu? `docker ps` ile kontrol edin
- Firewall 5432 portunu açık mı?
- Şifreler doğru mu?

### 3. Domain erişemiyor
- DNS ayarlarını kontrol edin
- Firewall 80/443 portlarını açık mı?
- Reverse proxy doğru yapılandırıldı mı?

## Backup & Restore

### PostgreSQL Backup

```bash
docker exec goldenupload-db pg_dump -U postgres goldenupload > backup.sql
```

### PostgreSQL Restore

```bash
docker exec -i goldenupload-db psql -U postgres goldenupload < backup.sql
```

## Üretim Önerileri

1. **Şifreleri değiştirin**: Güvenli, rastgele şifreler oluşturun
2. **SSL sertifikası**: Let's Encrypt ile HTTPS kullanın
3. **Volumeleri persist edin**: PostgreSQL verilerini yedekleyin
4. **Monitoring**: Portainer alertleri ayarlayın
5. **Log rotation**: Konteyner log döndürme ayarları yapılandırın
6. **Resource limits**: CPU ve bellek limitlerini ayarlayın

## İletişim ve Destek

Sorunlarla karşılaşırsanız:
- Portainer Logs sekmesini kontrol edin
- Docker Compose dosyasını validate edin: `docker-compose config`
- Konteyner loglarını inceleyin: `docker logs <konteyner_adı>`

---

**Not:** Bu konfigürasyon geliştirme ortamı için başlangıç yapısıdır. Üretim ortamında ek güvenlik önlemleri alınmalıdır.
