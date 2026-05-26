# 04 — Server Groups

Server Group adalah cara mengelompokkan server-server Anda berdasarkan kriteria yang masuk akal: project, klien, lingkungan (production / staging / dev), atau lokasi data center.

Group bersifat **opsional** — server bisa hidup tanpa group. Tapi kalau Anda mengelola lebih dari 5 server, group sangat membantu navigasi dan filter.

## Halaman Server Groups

Akses lewat **Sidebar → Server Groups**.

Tabel menampilkan:

- **Group Name** — nama group dengan ikon kotak.
- **Description** — deskripsi opsional.
- **Nodes** — jumlah server yang ada di group ini (badge angka).
- **Actions** — tombol Edit dan Delete.

## Membuat Group Baru

1. Klik tombol **New Group** di kanan atas.
2. Modal "Create New Server Group" muncul.
3. Isi:
   - **Group Name** — wajib. Contoh: "Production Cluster", "Klien Acme", "Staging EU".
   - **Description** — opsional. Tulis fungsi group atau catatan internal.
4. Klik **Create Group**.

Group baru akan langsung muncul di tabel.

## Mengedit Group

1. Klik ikon pensil di kolom Actions.
2. Modal "Update Server Group" muncul dengan field yang sudah terisi.
3. Ubah nama atau deskripsi.
4. Klik **Save Changes**.

## Menghapus Group

1. Klik ikon tempat sampah di kolom Actions.
2. Modal konfirmasi muncul: "Delete Server Group?".
3. Klik **Delete Group** untuk konfirmasi.

> **Yang terjadi pada server di dalam group yang dihapus?** Server tidak ikut terhapus. Mereka hanya jadi "unassigned" — tetap aktif dan bisa dipakai, hanya tidak punya group lagi. Anda bisa assign ke group lain dari halaman edit server masing-masing.

## Memakai Group di Halaman Server

Saat Anda mendaftarkan atau mengedit server, akan ada dropdown **Server Group**. Pilih dari daftar group yang sudah ada. Kalau belum ada group yang cocok, batalkan dulu, buat group baru, lalu kembali ke form server.

## Tips

- **Pakai nama yang konsisten.** Misal selalu pakai pola `<klien>-<env>` seperti "acme-prod", "acme-staging". Ini lebih mudah di-search di Cmd+K.
- **Description tidak harus diisi**, tapi berguna kalau Anda punya banyak operator. Tulis hal seperti "Hanya dipakai untuk weekly backup" atau "Akses hanya untuk tim DBA".
- **Group tidak punya warna atau ikon kustom** di versi saat ini. Diferensiasi visual hanya lewat nama.
- **Jumlah group tidak dibatasi.** Tapi terlalu banyak group (>20) biasanya tanda bahwa skema pengelompokan terlalu rinci.

## Contoh Skema Pengelompokan

Beberapa pola yang biasa dipakai tim:

**Per lingkungan:**
- Production
- Staging
- Development
- Disaster Recovery

**Per klien (untuk agency / service provider):**
- Acme Corp
- Beta Industries
- Gamma Studio

**Hybrid:**
- Acme - Production
- Acme - Staging
- Beta - Production

Pilih yang paling cocok dengan cara tim Anda bekerja.

---

[← Sebelumnya: Dashboard](03-dashboard.md) · [Kembali ke Daftar Isi](README.md) · [Selanjutnya: Server →](05-server.md)
