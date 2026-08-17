import { client } from "./sanity.client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export interface Article {
  _id: string;
  titre: string;
  slug: { current: string };
  date: string;
  categorie: string;
  extrait: string;
  imageCouverture?: {
    asset: { _ref: string };
    alt?: string;
  };
  contenu?: unknown[];
}

export async function getAllArticles(): Promise<Article[]> {
  return client.fetch(
    `*[_type == "article"] | order(date desc) {
      _id,
      titre,
      slug,
      date,
      categorie,
      extrait,
      imageCouverture,
      contenu
    }`
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return client.fetch(
    `*[_type == "article" && slug.current == $slug][0] {
      _id,
      titre,
      slug,
      date,
      categorie,
      extrait,
      imageCouverture,
      contenu
    }`,
    { slug }
  );
}

export async function getAllSlugs(): Promise<string[]> {
  const results = await client.fetch<Array<{ slug: { current: string } }>>(
    `*[_type == "article"] { slug }`
  );
  return results.map((r) => r.slug.current);
}

export interface GuideVisuel {
  _id: string;
  titre: string;
  slug: { current: string };
  date: string;
  categorie: string;
  description: string;
  imageCouverture?: {
    asset: { _ref: string };
    alt?: string;
  };
  embedGamma: string;
}

export type BlogListItem =
  | (Article & { _type: "article" })
  | (GuideVisuel & { _type: "guideVisuel" });

export async function getAllBlogItems(): Promise<BlogListItem[]> {
  return client.fetch(
    `*[_type in ["article", "guideVisuel"]] | order(date desc) {
      _id,
      _type,
      titre,
      slug,
      date,
      categorie,
      extrait,
      description,
      imageCouverture,
      contenu,
      embedGamma
    }`
  );
}

export async function getGuideVisuelBySlug(
  slug: string
): Promise<GuideVisuel | null> {
  return client.fetch(
    `*[_type == "guideVisuel" && slug.current == $slug][0] {
      _id, titre, slug, date, categorie, description, imageCouverture, embedGamma
    }`,
    { slug }
  );
}

export async function getAllGuideVisuelSlugs(): Promise<string[]> {
  const results = await client.fetch<Array<{ slug: { current: string } }>>(
    `*[_type == "guideVisuel"] { slug }`
  );
  return results.map((r) => r.slug.current);
}
