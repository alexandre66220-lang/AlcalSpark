import type { MetadataRoute } from "next";
import { getAllArticles } from "../../../lib/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticles();

  return [
    {
      url: "https://alcalspark.com/blog/",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `https://alcalspark.com/blog/${article.slug.current}/`,
      lastModified: article.date ? new Date(article.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
