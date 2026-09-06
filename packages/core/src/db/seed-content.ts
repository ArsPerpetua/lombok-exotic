/**
 * Long-form demo content (brand story + SEO articles), kept out of seed.ts so
 * that file stays scannable. All Markdown; rendered on the storefront via
 * `marked`. Authored generic enough to also fit the Sasaku pitch.
 */

export const aboutPageBody = `Lombok Exotic lahir dari satu ruko kecil di Jalan Raya Senggigi. Awalnya
hanya rak berisi tenun, kaos, dan kopi untuk wisatawan yang mampir sebelum
kembali ke bandara. Hari ini Lombok Exotic menjadi salah satu pusat oleh-oleh
terlengkap di Lombok Barat — melayani pembeli perorangan, rombongan bus
wisata, sampai agen perjalanan dari luar pulau.

## Yang kami percaya

Oleh-oleh yang baik menceritakan tempat asalnya. Karena itu kami bekerja
langsung dengan perajin tenun Sukarara, pengrajin perak Desa Ungga, dan
petani kopi Sembalun — bukan lewat perantara. Setiap produk punya cerita,
dan cerita itu kami tulis di halaman produknya.

## Merek terdaftar

"Lombok Exotic" adalah merek dagang terdaftar di Direktorat Jenderal
Kekayaan Intelektual (DJKI), Kementerian Hukum. Logo gotik merah di atar
hitam adalah identitas resmi kami.

## Tiga unit, satu pengalaman

- **Toko oleh-oleh** — ratusan SKU produk khas Lombok, dikurasi.
- **Kafe & resto** — tempat rombongan beristirahat dan makan siang.
- **Bajang Bus** — armada bus wisata untuk grup hingga 30 orang.

## Kirim ke seluruh Indonesia

Tidak sempat mampir? Belanja online. Semua produk kami timbang dan ukur
akurat per varian, jadi ongkos kirim yang muncul di layar adalah ongkos
kirim yang sebenarnya — tidak ada kejutan.
`;

export interface ArticleSeed {
  slug: string;
  locale: 'id' | 'en';
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  author: string;
  /** days before "now" this was published (controls ordering) */
  publishedDaysAgo: number;
  body: string;
}

export const articleSeed: ArticleSeed[] = [
  {
    slug: 'oleh-oleh-khas-lombok-yang-wajib-dibawa-pulang',
    locale: 'id',
    title: 'Oleh-Oleh Khas Lombok yang Wajib Dibawa Pulang',
    excerpt:
      'Dari tenun ikat Sukarara sampai kopi robusta Sembalun — daftar oleh-oleh Lombok yang paling dicari dan cara memilih yang asli.',
    metaTitle: 'Oleh-Oleh Khas Lombok yang Wajib Dibawa Pulang (2026)',
    metaDescription:
      'Panduan lengkap oleh-oleh khas Lombok: tenun Sukarara, perak Lombok, kopi Sembalun, dodol rumput laut, dan tas ketak. Plus tips membedakan yang asli.',
    author: 'Tim Lombok Exotic',
    publishedDaysAgo: 21,
    body: `Lombok bukan cuma pantai dan Rinjani. Pulau ini punya kerajinan tangan dan
kuliner yang sudah dikenal sejak lama. Berikut oleh-oleh yang paling sering
dicari wisatawan — dan cara memilih yang benar-benar berkualitas.

## 1. Tenun Ikat Sukarara

Desa Sukarara di Lombok Tengah adalah sentra tenun paling terkenal.
Motif **Subahnale** — namanya dari ucapan "Subhanallah" saat perajin
menyelesaikan lembaran yang butuh berminggu-minggu — adalah yang paling
dicari.

Tips memilih:

- Balik kainnya. Tenun tangan asli punya benang yang sedikit tidak rata di
  bagian belakang; kain pabrik terlalu rapi.
- Tanya pewarnanya. Pewarna alami (indigo, mengkudu, kunyit) warnanya lebih
  kalem dan tidak luntur berlebihan.
- Harga wajar untuk selembar tenun tangan mulai dari ratusan ribu, bukan
  puluhan ribu.

## 2. Perak Lombok

Kerajinan perak filigri dari Desa Ungga dan Kamasan dibentuk dari benang
perak halus yang dipilin. Cari cap kadar (925) di bagian dalam, dan
perhatikan kerapian sambungan filigrinya.

## 3. Kopi Sembalun & Kopi Lombok

Lereng Rinjani menghasilkan robusta dan arabika dengan body tebal. Beli yang
tanggal roasting-nya jelas, dan kalau bisa dalam bentuk biji — digiling saat
mau diseduh rasanya jauh lebih baik.

## 4. Dodol Rumput Laut

Lombok penghasil rumput laut besar. Dodolnya kenyal, tidak terlalu manis,
dan tahan beberapa minggu — cocok untuk oleh-oleh kantor.

## 5. Tas Anyaman Ketak

Ketak adalah tumbuhan paku yang tumbuh liar di hutan Lombok. Dianyam rapat,
tas ketak bisa bertahan puluhan tahun dan makin mengkilap seiring waktu.

## Belanja tanpa harus mampir

Semua produk di atas tersedia di katalog Lombok Exotic dan dikirim ke seluruh
Indonesia. Berat dan dimensi setiap varian sudah kami ukur akurat, jadi
ongkos kirim yang tampil sudah final.
`,
  },
  {
    slug: 'tips-kirim-oleh-oleh-aman-ke-luar-lombok',
    locale: 'id',
    title: 'Tips Mengirim Oleh-Oleh Lombok Agar Aman Sampai Rumah',
    excerpt:
      'Tenun, perak, dan makanan basah butuh perlakuan berbeda saat dikirim. Panduan pengemasan dan pemilihan kurir dari Senggigi.',
    metaTitle: 'Cara Mengirim Oleh-Oleh Lombok Agar Aman Sampai Tujuan',
    metaDescription:
      'Tips mengemas dan mengirim oleh-oleh khas Lombok — tenun, perak, dodol, kopi — agar aman sampai ke luar pulau. Estimasi ongkir dan lama pengiriman dari Lombok.',
    author: 'Tim Lombok Exotic',
    publishedDaysAgo: 12,
    body: `Membawa oleh-oleh Lombok di koper kabin sering bikin repot: tenun kusut,
dodol meleleh, perak tergores. Kirim lewat ekspedisi sebenarnya lebih aman
kalau tahu caranya.

## Kelompokkan berdasarkan sifat barang

| Jenis | Risiko | Penanganan |
| --- | --- | --- |
| Tenun & kaos | Kusut, lembap | Gulung, jangan dilipat; masukkan plastik anti air |
| Perak | Tergores, kusam | Bungkus tisu bebas asam, masukkan pouch kecil |
| Dodol & basah | Meleleh, bocor | Segel ulang, jauhkan dari sisi kardus |
| Kopi | Aroma hilang | Biarkan dalam kemasan aslinya yang bervalve |

## Pilih kurir yang benar-benar menjemput di Lombok

Tidak semua kurir punya armada penjemputan harian di Lombok Barat. Dari area
Senggigi–Mataram, layanan reguler biasanya sampai ke Jawa dalam 2–4 hari,
ke luar Jawa 4–7 hari.

## Biarkan sistem yang menghitung

Saat belanja online di Lombok Exotic, berat dan dimensi tiap produk sudah
tercatat. Anda tinggal memilih kurir dan layanan; ongkir dihitung otomatis
dari titik asal toko. Tidak ada penimbangan ulang, tidak ada tagihan
tambahan di tujuan.

## Lacak sampai depan pintu

Setiap pengiriman dari Lombok Exotic dapat nomor resi yang bisa dilacak
langsung dari halaman **Lacak Pesanan** — tanpa perlu membuat akun.
`,
  },
  {
    slug: 'pesanan-rombongan-untuk-tour-leader-dan-agen',
    locale: 'id',
    title: 'Rombongan Bus 30 Orang, Waktu Mampir 40 Menit: Cara Kerjanya',
    excerpt:
      'Untuk tour leader dan agen perjalanan: cara memesan paket oleh-oleh untuk satu rombongan sebelum bus tiba, plus komisi tour leader.',
    metaTitle: 'Pesanan Oleh-Oleh Rombongan untuk Tour Leader & Agen Wisata Lombok',
    metaDescription:
      'Tour leader bisa memesan paket oleh-oleh untuk rombongan sebelum bus tiba di Lombok Exotic. Paket disiapkan lebih dulu, pembayaran satu pintu, plus komisi tour leader.',
    author: 'Tim Lombok Exotic',
    publishedDaysAgo: 4,
    body: `Bus pariwisata biasanya hanya berhenti 30–45 menit di toko oleh-oleh. Kalau
30 penumpang mengantre di kasir bersamaan, setengah rombongan tidak sempat
belanja. Modul **Pesanan Rombongan** Lombok Exotic dibuat untuk itu.

## Alur untuk tour leader / agen

1. **Kirim rencana** lewat halaman Pesanan Rombongan: tanggal kedatangan,
   jumlah pax, dan gambaran paket ("30 paket @ Rp150k: kopi + kaos +
   gantungan").
2. **Tim kami buat penawaran** — rincian isi paket, harga, dan total.
3. **Konfirmasi & bayar** satu kali untuk seluruh rombongan.
4. **Paket sudah siap** dengan nama rombongan saat bus tiba. Penumpang
   tinggal ambil.

## Komisi tour leader

Tour leader dan sopir yang rutin membawa rombongan terdaftar dengan **kode
referral** sendiri. Setiap pesanan yang masuk atas nama Anda tercatat, dan
komisi direkap per bulan. Kode bisa dicetak sebagai kartu QR untuk dibagikan.

## Kenapa dipesan dulu

- Tidak ada antrean kasir untuk rombongan.
- Harga paket terkunci sejak penawaran disetujui.
- Stok dipastikan tersedia — tidak ada "maaf kaosnya habis".
- Satu invoice untuk laporan agen.

Hubungi kami minimal H-2 sebelum kedatangan untuk paket dalam jumlah besar.
`,
  },
  {
    slug: 'choosing-authentic-lombok-souvenirs',
    locale: 'en',
    title: 'How to Choose Authentic Lombok Souvenirs',
    excerpt:
      'A quick buyer’s guide to Lombok’s handwoven ikat, filigree silver, and Rinjani coffee — and how to spot the real thing.',
    metaTitle: 'How to Choose Authentic Lombok Souvenirs — Buyer’s Guide',
    metaDescription:
      'What to buy in Lombok and how to tell authentic handwoven ikat, filigree silver, and single-origin Rinjani coffee from mass-market copies.',
    author: 'Lombok Exotic Team',
    publishedDaysAgo: 8,
    body: `Lombok’s craft villages have supplied traders for generations. Here is what
is worth carrying home and how to judge quality.

## Handwoven ikat from Sukarara

Turn the cloth over. Genuine hand-weaving leaves slightly uneven threads on
the back; factory cloth looks too perfect. Ask about the dye — natural indigo
and morinda give softer, more stable colours.

## Filigree silver

Look for the 925 purity stamp inside the piece and check how cleanly the
twisted silver threads are joined.

## Rinjani coffee

Buy beans with a clear roast date, ideally whole. The volcanic slopes around
Sembalun produce a heavy-bodied robusta and a brighter arabica.

## Shopping from home

Every product in the Lombok Exotic catalogue ships across Indonesia with
accurate per-variant weight and dimensions, so the shipping price you see is
the price you pay.
`,
  },
];
