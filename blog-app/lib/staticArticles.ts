import type { Article } from "./queries";

/**
 * Articles écrits en HTML (blog-static/<slug>/index.html, copiés dans /blog/<slug>/ par build.sh).
 * Ils ne sont pas dans Sanity : cette liste les ajoute à la page /blog/ et au sitemap du blog.
 * Ajouter ici chaque nouvel article statique (même slug que le dossier de blog-static/).
 */
export const STATIC_ARTICLES: Article[] = [
  {
    _id: "static-sous-traiter-integration-figma-code",
    titre: "Sous-traiter l'intégration Figma → code : prix, process et pièges à éviter",
    slug: { current: "sous-traiter-integration-figma-code" },
    date: "2026-10-23",
    categorie: "Création web",
    extrait:
      "Quand sous-traiter l'intégration Figma vers code, comment préparer vos maquettes, quel prix (350 à 600 € chez ALCALSPARK) et quels pièges éviter.",
  },
];

/** Articles Sanity + articles statiques, du plus récent au plus ancien. */
export function withStaticArticles(articles: Article[]): Article[] {
  const slugs = new Set(articles.map((a) => a.slug.current));
  return [...articles, ...STATIC_ARTICLES.filter((a) => !slugs.has(a.slug.current))].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
}
