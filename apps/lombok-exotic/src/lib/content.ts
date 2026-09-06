import 'server-only';
import { db, schema } from '@lombok-exotic/core/db';
import { and, desc, eq } from 'drizzle-orm';
import { marked } from 'marked';

const { articles, contentPages } = schema;

function normLocale(locale: string): 'id' | 'en' {
  return locale === 'en' ? 'en' : 'id';
}

/** Render trusted (admin-authored) Markdown to an HTML string. */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

export interface ArticleTeaser {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
}

/** Published articles for the given locale, newest first. [] on any error. */
export async function getLatestArticles(locale: string, limit = 3): Promise<ArticleTeaser[]> {
  try {
    return await db.query.articles.findMany({
      where: and(eq(articles.status, 'published'), eq(articles.locale, normLocale(locale))),
      orderBy: [desc(articles.publishedAt)],
      limit,
      columns: {
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        author: true,
        publishedAt: true,
      },
    });
  } catch (err) {
    console.warn('[content] getLatestArticles failed:', err);
    return [];
  }
}

/** Every published article for the locale (blog index). */
export async function getPublishedArticles(locale: string): Promise<ArticleTeaser[]> {
  try {
    return await db.query.articles.findMany({
      where: and(eq(articles.status, 'published'), eq(articles.locale, normLocale(locale))),
      orderBy: [desc(articles.publishedAt)],
      columns: {
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        author: true,
        publishedAt: true,
      },
    });
  } catch (err) {
    console.warn('[content] getPublishedArticles failed:', err);
    return [];
  }
}

export interface ArticleFull extends ArticleTeaser {
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: Date;
}

/** One published article by slug, or null. */
export async function getArticle(locale: string, slug: string): Promise<ArticleFull | null> {
  try {
    const row = await db.query.articles.findFirst({
      where: and(
        eq(articles.slug, slug),
        eq(articles.locale, normLocale(locale)),
        eq(articles.status, 'published'),
      ),
    });
    if (!row) return null;
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      coverImageUrl: row.coverImageUrl,
      author: row.author,
      publishedAt: row.publishedAt,
      body: row.body,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.warn('[content] getArticle failed:', err);
    return null;
  }
}

/** All published article slugs (both locales) for sitemap / static params. */
export async function getAllArticleSlugs(): Promise<
  Array<{ slug: string; locale: string; updatedAt: Date }>
> {
  try {
    return await db.query.articles.findMany({
      where: eq(articles.status, 'published'),
      columns: { slug: true, locale: true, updatedAt: true },
    });
  } catch {
    return [];
  }
}

export interface ContentPage {
  title: string;
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

/** An editable static page (about / brand story / FAQ), or null. */
export async function getContentPage(locale: string, slug: string): Promise<ContentPage | null> {
  try {
    const row = await db.query.contentPages.findFirst({
      where: and(
        eq(contentPages.slug, slug),
        eq(contentPages.locale, normLocale(locale)),
        eq(contentPages.status, 'published'),
      ),
    });
    if (!row) return null;
    return {
      title: row.title,
      body: row.body,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
    };
  } catch (err) {
    console.warn('[content] getContentPage failed:', err);
    return null;
  }
}
