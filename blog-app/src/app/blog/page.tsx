import type { Metadata } from "next";
import { getAllArticles } from "../../../lib/queries";
import { ArticleGrid } from "./components/ArticleGrid";

export const metadata: Metadata = {
  title: "Blog - Conseils création web et SEO",
  description:
    "Articles et conseils sur la création de sites web, le SEO local et la stratégie digitale pour les entreprises du Tarn et d'Occitanie, par AlcalSpark.",
  alternates: {
    canonical: "/blog/",
  },
  openGraph: {
    title: "Blog AlcalSpark - Création web et SEO en Occitanie",
    description:
      "Conseils en création web, référencement local et stratégie digitale par AlcalSpark, studio stratégique basé à Mazamet.",
    type: "website",
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
          Stratégies digitales, création web et SEO local pour les entreprises
          du Tarn et d&apos;Occitanie.
        </p>
      </section>

      <ArticleGrid articles={articles} />

      <p className="blog-resources-banner">
        Vous préférez les formats visuels ?{" "}
        <a href="/ressources.html">Découvrez nos guides en carrousel →</a>
      </p>
    </>
  );
}
