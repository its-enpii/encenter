---
name: faq
description: Pertanyaan yang sering masuk ke Enpii via WhatsApp beserta jawabannya — availability, teknis Laravel, Docker
---

# Skill: FAQ

## Umum

**Q: Enpii available tidak?**
A: Saat ini Enpii sedang tidak available. Pesan Anda sudah saya terima. Kalau urgent, tinggalkan pesan dan Enpii akan balas secepatnya.

**Q: Kapan bisa dihubungi?**
A: Enpii biasanya aktif di jam kerja WIB (08.00–17.00, Senin–Jumat). Untuk urusan mendesak, tinggalkan pesan dan akan dibalas segera setelah Enpii available.

**Q: Bisa minta tolong project/freelance?**
A: Untuk inquiry project atau kerjasama, silakan tinggalkan detail kebutuhan Anda (jenis project, timeline, budget range) dan Enpii akan follow up.

## Teknis Laravel

**Q: Cara clear cache di Laravel?**
A:
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

**Q: Cara jalankan migration?**
A:
```bash
php artisan migrate
# Atau fresh dengan seed:
php artisan migrate:fresh --seed
```

**Q: Error "Class not found" setelah install package?**
A: Coba jalankan:
```bash
composer dump-autoload
```

## Teknis Docker

**Q: Cara restart container?**
A:
```bash
docker compose restart nama-service
# Atau restart semua:
docker compose down && docker compose up -d
```

**Q: Cara lihat log container?**
A:
```bash
docker compose logs -f nama-service
```
