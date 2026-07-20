import type { Metadata } from "next";
import { getAllArticles } from "../../../lib/queries";
import { ArticleGrid } from "./components/ArticleGrid";

export const metadata: Metadata = {
  title: "Blog - Conseils creation web et SEO",
  description:
    "Articles et conseils sur la creation de sites web, le SEO local et la strategie digitale pour les entreprises du Tarn et d'Occitanie, par AlcalSpark.",
  alternates: {
    canonical: "/blog/",
  },
  openGraph: {
    title: "Blog AlcalSpark - Creation web et SEO en Occitanie",
    description:
      "Conseils en creation web, referencement local et strategie digitale par AlcalSpark, studio premium base a Mazamet.",
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
          Strategies digitales, creation web et SEO local pour les entreprises
          du Tarn et d&apos;Occitanie.
        </p>
      </section>

      <ArticleGrid articles={articles} />
    </>
  );
}
