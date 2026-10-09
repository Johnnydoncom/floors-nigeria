import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, ApiError, CacheTags } from "./client";
import type {
  BlogPost,
  ContentPage,
  ContentPageSummary,
  Envelope,
  PortfolioProject,
  PortfolioProjectDetail,
  PostList,
} from "./types";

/**
 * CMS reads (§18): pages, the journal and the portfolio.
 *
 * Cached like the catalogue and tagged `content`, which the admin proxy
 * purges whenever an editor saves — so a published change shows at once
 * without a rebuild.
 */

/**
 * Degrade to `fallback` when the API is unreachable; a 404 goes to
 * `onNotFound`. A degraded result is cached for minutes only.
 */
async function withFallback<T>(
  read: () => Promise<T>,
  fallback: T,
  onNotFound?: () => T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (onNotFound && error instanceof ApiError && error.status === 404) return onNotFound();
    console.error("[content] API read failed, serving fallback:", error);
    cacheLife("minutes");
    return fallback;
  }
}

const EMPTY_POSTS: PostList = {
  data: [],
  links: { first: null, last: null, prev: null, next: null },
  meta: { current_page: 1, from: null, last_page: 1, per_page: 0, to: null, total: 0 },
  categories: [],
};

export async function getPages(): Promise<ContentPageSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.content);

  return withFallback(
    async () => (await api.get<Envelope<ContentPageSummary[]>>("/v1/pages")).data,
    [],
  );
}

export async function getPage(slug: string): Promise<ContentPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.content);

  return withFallback(
    async () =>
      (await api.get<Envelope<ContentPage>>(`/v1/pages/${encodeURIComponent(slug)}`)).data,
    null,
    () => null,
  );
}

export type PostQuery = {
  category?: string;
  page?: number;
  per_page?: number;
  exclude?: string;
  featured?: boolean;
};

export async function getPosts(query: PostQuery = {}): Promise<PostList> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.content);

  return withFallback(() => api.get<PostList>("/v1/posts", { query }), EMPTY_POSTS);
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.content);

  return withFallback(
    async () => (await api.get<Envelope<BlogPost>>(`/v1/posts/${encodeURIComponent(slug)}`)).data,
    null,
    () => null,
  );
}

export async function getPortfolio(
  query: { sector?: string; featured?: boolean; limit?: number } = {},
): Promise<PortfolioProject[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.content);

  return withFallback(
    async () => (await api.get<Envelope<PortfolioProject[]>>("/v1/portfolio", { query })).data,
    [],
  );
}

export async function getPortfolioProject(slug: string): Promise<PortfolioProjectDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.content);

  return withFallback(
    async () =>
      (await api.get<Envelope<PortfolioProjectDetail>>(`/v1/portfolio/${encodeURIComponent(slug)}`))
        .data,
    null,
    () => null,
  );
}
