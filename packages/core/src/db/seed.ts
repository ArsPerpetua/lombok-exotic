/**
 * Demo seed data for the pitch. Idempotent-ish: safe to re-run, uses stable
 * slugs/keys with onConflictDoNothing. Run: `pnpm db:seed`.
 *
 * Creates: 1 outlet, price tiers, an owner login, categories, a handful of
 * products with variants (real weights), a bundle, a voucher, a tour leader,
 * one article + about page, a hero banner, and store settings.
 */
import 'dotenv/config';
import { db } from './index';
import * as s from './schema/index';
import { auth } from '../auth/index';
import { articleSeed, aboutPageBody } from './seed-content';
import { eq } from 'drizzle-orm';

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@lombokexotic.test';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe-Now-2026';

async function main() {
  console.log('seeding…');

  // ── Outlet ───────────────────────────────────────────────────────────────
  await db
    .insert(s.locations)
    .values({
      name: 'Lombok Exotic Senggigi',
      slug: 'senggigi',
      phone: '6281900000000',
      addressLine: 'Jl. Raya Senggigi',
      city: 'Lombok Barat',
      province: 'Nusa Tenggara Barat',
      isDefault: true,
    })
    .onConflictDoNothing({ target: s.locations.slug });

  // ── Price tiers ──────────────────────────────────────────────────────────
  await db
    .insert(s.priceTiers)
    .values([
      { name: 'Agen Wisata', code: 'agent', discountType: 'percent', discountValue: 10 },
      {
        name: 'Reseller',
        code: 'reseller',
        discountType: 'percent',
        discountValue: 20,
        minOrderValueIdr: 1_000_000,
      },
    ])
    .onConflictDoNothing({ target: s.priceTiers.code });

  // ── Owner login ──────────────────────────────────────────────────────────
  const existingOwner = await db.query.user.findFirst({
    where: eq(s.user.email, OWNER_EMAIL),
  });
  if (!existingOwner) {
    await auth.api.signUpEmail({
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD, name: 'Owner' },
    });
    await db.update(s.user).set({ role: 'owner' }).where(eq(s.user.email, OWNER_EMAIL));
    console.log(`  owner login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  }

  // ── Categories ───────────────────────────────────────────────────────────
  const cats = [
    { name: 'Tenun & Batik', slug: 'tenun-batik' },
    { name: 'Perhiasan Perak', slug: 'perak' },
    { name: 'Tas & Aksesoris', slug: 'tas-aksesoris' },
    { name: 'Kaos', slug: 'kaos' },
    { name: 'Makanan Khas', slug: 'makanan' },
    { name: 'Paket Oleh-Oleh', slug: 'paket' },
  ];
  await db.insert(s.categories).values(cats).onConflictDoNothing({ target: s.categories.slug });
  const catRows = await db.select().from(s.categories);
  const catId = (slug: string) => catRows.find((c) => c.slug === slug)?.id;

  // ── Products + variants ──────────────────────────────────────────────────
  const products: Array<{
    slug: string;
    name: string;
    cat: string;
    type: 'simple' | 'variable';
    story?: string;
    variants: Array<{ sku: string; name: string; price: number; weight: number; stock: number; attrs?: Record<string, string> }>;
  }> = [
    {
      slug: 'tenun-ikat-subahnale',
      name: 'Tenun Ikat Motif Subahnale',
      cat: 'tenun-batik',
      type: 'variable',
      story:
        'Motif Subahnale ditenun tangan oleh perajin Sukarara. Satu lembar butuh berminggu-minggu; namanya berasal dari ucapan "Subhanallah" saat menyelesaikannya.',
      variants: [
        { sku: 'TEN-SUB-NAT', name: 'Pewarna Alami', price: 850_000, weight: 400, stock: 6, attrs: { pewarna: 'Alami' } },
        { sku: 'TEN-SUB-SIN', name: 'Pewarna Sintetis', price: 450_000, weight: 380, stock: 12, attrs: { pewarna: 'Sintetis' } },
      ],
    },
    {
      slug: 'gelang-perak-filigri',
      name: 'Gelang Perak Filigri Lombok',
      cat: 'perak',
      type: 'variable',
      story: 'Kerajinan perak filigri khas Desa Ungga, dibentuk dari benang perak halus.',
      variants: [
        { sku: 'PRK-GLG-S', name: 'Ukuran S', price: 320_000, weight: 25, stock: 15, attrs: { ukuran: 'S' } },
        { sku: 'PRK-GLG-M', name: 'Ukuran M', price: 350_000, weight: 28, stock: 15, attrs: { ukuran: 'M' } },
        { sku: 'PRK-GLG-L', name: 'Ukuran L', price: 380_000, weight: 31, stock: 10, attrs: { ukuran: 'L' } },
      ],
    },
    {
      slug: 'kaos-lombok-exotic-signature',
      name: 'Kaos Lombok Exotic Signature',
      cat: 'kaos',
      type: 'variable',
      variants: [
        { sku: 'KAO-SIG-M', name: 'M', price: 95_000, weight: 200, stock: 40, attrs: { ukuran: 'M' } },
        { sku: 'KAO-SIG-L', name: 'L', price: 95_000, weight: 220, stock: 40, attrs: { ukuran: 'L' } },
        { sku: 'KAO-SIG-XL', name: 'XL', price: 105_000, weight: 240, stock: 25, attrs: { ukuran: 'XL' } },
      ],
    },
    {
      slug: 'kopi-lombok-robusta-200g',
      name: 'Kopi Lombok Robusta 200g',
      cat: 'makanan',
      type: 'simple',
      variants: [{ sku: 'MKN-KOP-200', name: '200 gram', price: 55_000, weight: 250, stock: 120 }],
    },
    {
      slug: 'dodol-rumput-laut',
      name: 'Dodol Rumput Laut Lombok',
      cat: 'makanan',
      type: 'simple',
      variants: [{ sku: 'MKN-DOD-250', name: '250 gram', price: 35_000, weight: 300, stock: 200 }],
    },
    {
      slug: 'tas-anyaman-ketak',
      name: 'Tas Anyaman Ketak',
      cat: 'tas-aksesoris',
      type: 'simple',
      story: 'Dianyam dari rumput ketak yang tumbuh liar di hutan Lombok, tahan puluhan tahun.',
      variants: [{ sku: 'TAS-KET-01', name: 'Standar', price: 185_000, weight: 350, stock: 18 }],
    },
  ];

  for (const p of products) {
    const [row] = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        categoryId: catId(p.cat),
        type: p.type,
        status: 'active',
        story: p.story,
        isFeatured: true,
        priceFrom: Math.min(...p.variants.map((v) => v.price)),
      })
      .onConflictDoNothing({ target: s.products.slug })
      .returning();
    const productId =
      row?.id ??
      (await db.query.products.findFirst({ where: eq(s.products.slug, p.slug) }))?.id;
    if (!productId) continue;

    for (const v of p.variants) {
      await db
        .insert(s.productVariants)
        .values({
          productId,
          sku: v.sku,
          name: v.name,
          priceIdr: v.price,
          weightGrams: v.weight,
          stock: v.stock,
          attributes: v.attrs ?? {},
        })
        .onConflictDoNothing({ target: s.productVariants.sku });
    }
  }

  // ── Bundle: Paket Oleh-Oleh Hemat ────────────────────────────────────────
  const [bundle] = await db
    .insert(s.products)
    .values({
      slug: 'paket-oleh-oleh-hemat',
      name: 'Paket Oleh-Oleh Hemat',
      categoryId: catId('paket'),
      type: 'bundle',
      status: 'active',
      shortDescription: 'Kopi + dodol + kaos — pas untuk rombongan.',
      priceFrom: 180_000,
      isFeatured: true,
    })
    .onConflictDoNothing({ target: s.products.slug })
    .returning();
  const bundleId =
    bundle?.id ??
    (await db.query.products.findFirst({ where: eq(s.products.slug, 'paket-oleh-oleh-hemat') }))
      ?.id;
  if (bundleId) {
    await db
      .insert(s.productVariants)
      .values({
        productId: bundleId,
        sku: 'PKT-HEMAT',
        name: 'Paket Hemat',
        priceIdr: 180_000,
        weightGrams: 770,
        stock: 999,
      })
      .onConflictDoNothing({ target: s.productVariants.sku });
    const vmap = await db.select().from(s.productVariants);
    const vid = (sku: string) => vmap.find((v) => v.sku === sku)?.id;
    for (const [sku, qty] of [
      ['MKN-KOP-200', 1],
      ['MKN-DOD-250', 1],
      ['KAO-SIG-L', 1],
    ] as const) {
      const variantId = vid(sku);
      if (variantId)
        await db
          .insert(s.bundleItems)
          .values({ bundleProductId: bundleId, variantId, quantity: qty })
          .onConflictDoNothing();
    }
  }

  // ── Voucher ──────────────────────────────────────────────────────────────
  await db
    .insert(s.vouchers)
    .values({
      code: 'LOMBOK10',
      description: 'Diskon 10% pembukaan toko online',
      discountType: 'percent',
      discountValue: 10,
      maxDiscountIdr: 100_000,
      usageLimit: 500,
    })
    .onConflictDoNothing({ target: s.vouchers.code });

  // ── Tour leaders ─────────────────────────────────────────────────────────
  // Stable referral codes so re-seeding + printed QR cards stay valid.
  // Drop the pre-stable-code demo row if it's still around from an early seed.
  await db.delete(s.tourLeaders).where(eq(s.tourLeaders.name, 'Pak Wayan (demo)'));
  const tourLeaderSeed: (typeof s.tourLeaders.$inferInsert)[] = [
      {
        name: 'Pak Wayan Sudana',
        phone: '6281811112222',
        agencyName: 'Lombok Tour Service',
        referralCode: 'TL-WAYAN01',
        commissionType: 'percent',
        commissionValue: 5,
        bankName: 'BRI',
        bankAccount: '003201000123456',
        bankHolder: 'I Wayan Sudana',
        notes: 'Rutin bawa rombongan kapal pesiar dari Benoa. Kontak via WA saja.',
      },
      {
        name: 'Ibu Ni Luh Ariani',
        phone: '6281833334444',
        agencyName: 'Bali Nusra Holiday',
        referralCode: 'TL-ARIANI1',
        commissionType: 'percent',
        commissionValue: 7,
        bankName: 'BCA',
        bankAccount: '7712345678',
        bankHolder: 'Ni Luh Ariani',
      },
      {
        name: 'Sopir — H. Amaq Rusdi',
        phone: '6281855556666',
        agencyName: null,
        referralCode: 'TL-RUSDI01',
        commissionType: 'fixed',
        commissionValue: 15_000,
        notes: 'Sopir freelance bus pariwisata. Komisi flat per paket terjual.',
      },
  ];
  for (const tl of tourLeaderSeed) {
    await db
      .insert(s.tourLeaders)
      .values(tl)
      .onConflictDoUpdate({
        target: s.tourLeaders.phone,
        set: {
          name: tl.name,
          agencyName: tl.agencyName ?? null,
          referralCode: tl.referralCode,
          commissionType: tl.commissionType,
          commissionValue: tl.commissionValue,
          updatedAt: new Date(),
        },
      });
  }

  // ── Content ──────────────────────────────────────────────────────────────
  const aboutMeta = {
    metaTitle: 'Tentang Lombok Exotic — Pusat Oleh-Oleh Khas Lombok di Senggigi',
    metaDescription:
      'Lombok Exotic: pusat oleh-oleh khas Lombok di Senggigi. Bekerja langsung dengan perajin tenun, perak, dan kopi. Merek terdaftar DJKI.',
  };
  const nowMs = Date.now();
  for (const a of articleSeed) {
    const publishedAt = new Date(nowMs - a.publishedDaysAgo * 86_400_000);
    const row = {
      title: a.title,
      excerpt: a.excerpt,
      body: a.body,
      status: 'published' as const,
      publishedAt,
      author: a.author,
      metaTitle: a.metaTitle,
      metaDescription: a.metaDescription,
    };
    await db
      .insert(s.articles)
      .values({ slug: a.slug, locale: a.locale, ...row })
      .onConflictDoUpdate({
        target: [s.articles.slug, s.articles.locale],
        set: { ...row, updatedAt: new Date() },
      });
  }

  await db
    .insert(s.contentPages)
    .values({
      slug: 'tentang',
      locale: 'id',
      title: 'Tentang Lombok Exotic',
      body: aboutPageBody,
      status: 'published',
      ...aboutMeta,
    })
    .onConflictDoUpdate({
      target: [s.contentPages.slug, s.contentPages.locale],
      set: { body: aboutPageBody, status: 'published', ...aboutMeta, updatedAt: new Date() },
    });

  await db
    .insert(s.banners)
    .values({
      title: 'Belanja Oleh-Oleh Lombok, Kirim ke Rumah',
      imageUrl: '/banners/hero-placeholder.jpg',
      linkUrl: '/id/katalog',
      position: 'hero',
      locale: 'id',
      isActive: true,
    })
    .onConflictDoNothing();

  // ── Settings ─────────────────────────────────────────────────────────────
  for (const [key, value] of Object.entries({
    'contact.whatsapp': '6281900000000',
    'shipping.origin_area_id': process.env.STORE_ORIGIN_AREA_ID ?? '',
    'checkout.payment_expiry_minutes': 60,
  })) {
    await db
      .insert(s.settings)
      .values({ key, value })
      .onConflictDoNothing({ target: s.settings.key });
  }

  console.log('seed done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
