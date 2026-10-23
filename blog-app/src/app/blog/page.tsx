import type { Metadata } from "next";
import { getAllArticles } from "../../../lib/queries";
import { ArticleGrid } from "./components/ArticleGrid";

export const metadata: Metadata = {
  title: "Blog - Conseils création web et SEO",
  description:
    "Articles et conseils sur la création de sites web, le SEO, l'automatisation et l'intégration Figma vers code, par AlcalSpark.",
  alternates: {
    canonical: "/blog/",
  },
  openGraph: {
    title: "Blog AlcalSpark : création web, SEO, automatisation",
    description:
      "Conseils en création web, SEO, automatisation et intégration Figma vers code par AlcalSpark, studio d'un seul expert.",
    type: "website",
    url: "/blog/",
    images: [{ url: "/assets/og-cover.jpg", width: 1200, height: 630, alt: "AlcalSpark, studio à Mazamet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog AlcalSpark : création web, SEO, automatisation",
    description:
      "Conseils en création web, SEO, automatisation et intégration Figma vers code par AlcalSpark, studio d'un seul expert.",
    images: ["/assets/og-cover.jpg"],
  },
};

export default async function BlogListPage() {
  const articles = await getAllArticles();

  return (
    <>
      <section className="blog-list-hero">
        <h1>
          Le <span>Blog</span> AlcalSpark
        </h1>
        <p>
          Création web, SEO, automatisation et intégration pour les PME, les
          startups et les agences.
        </p>
      </section>

      <ArticleGrid articles={articles} />

      <p className="blog-resources-banner">
        Vous préférez les formats visuels ?{" "}
        <a href="/ressources">Découvrez nos guides en carrousel →</a>
      </p>
      <p className="blog-resources-banner">
        Besoin d&apos;un site ou d&apos;une automatisation ?{" "}
        <a href="/tarifs">Voir les tarifs</a> ·{" "}
        <a href="/services/automatisation-ia">Automatisation IA</a> ·{" "}
        <a href="/agences">Offre agences</a>
      </p>
    </>
  );
}
