import 'server-only';
import { db, schema } from '@lombok-exotic/core/db';
import { and, desc, eq } from 'drizzle-orm';

const { articles } = schema;

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
    const rows = await db.query.articles.findMany({
      where: and(
        eq(articles.status, 'published'),
        eq(articles.locale, locale === 'en' ? 'en' : 'id'),
      ),
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
    return rows;
  } catch (err) {
    console.warn('[content] getLatestArticles failed:', err);
    return [];
  }
}
