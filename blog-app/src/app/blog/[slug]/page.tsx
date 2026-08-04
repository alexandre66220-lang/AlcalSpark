import type { Metadata } from "next";
import { PortableText } from "@portabletext/react";
import { getAllSlugs, getArticleBySlug } from "../../../../lib/queries";
import { notFound } from "next/navigation";

const ARTICLE_IMAGES: Record<string, string> = {
  "pourquoi-entreprise-castres-site-web-2026":
    "/assets/lucid-origin_Cinematic_close-up_of_a_smartphone_screen_reflecting_gold_light_in_a_dark_modern-0.jpg",
  "wordpress-vs-site-sur-mesure-artisan":
    "/assets/lucid-origin_Abstract_split_composition_one_side_showing_generic_template_grid_patterns_in_mu-0.jpg",
  "seo-local-doubler-visibilite-commerce-mazamet":
    "/assets/lucid-origin_Cinematic_aerial_view_of_a_small_French_town_at_dusk_warm_golden_street_lights_d-0.jpg",
};

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return {};

  return {
    title: article.titre,
    description: article.extrait,
    alternates: {
      canonical: `/blog/${params.slug}/`,
    },
    openGraph: {
      title: article.titre,
      description: article.extrait,
      type: "article",
      publishedTime: article.date,
      url: `/blog/${params.slug}/`,
    },
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const portableComponents = {
  block: {
    h2: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3>{children}</h3>,
    normal: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote>{children}</blockquote>
    ),
  },
};

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const heroImg = ARTICLE_IMAGES[params.slug];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.titre,
    description: article.extrait,
    datePublished: article.date,
    inLanguage: "fr-FR",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://alcalspark.com/blog/${params.slug}/`,
    },
    author: {
      "@type": "Organization",
      "@id": "https://alcalspark.com/#business",
      name: "AlcalSpark",
    },
    publisher: {
      "@type": "Organization",
      "@id": "https://alcalspark.com/#business",
      name: "AlcalSpark",
      logo: {
        "@type": "ImageObject",
        url: "https://alcalspark.com/assets/logo.png",
      },
    },
    image: heroImg
      ? `https://alcalspark.com${heroImg}`
      : "https://alcalspark.com/assets/og-cover.jpg",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article>
        {heroImg && (
          <div className="article-cover">
            <img src={heroImg} alt={article.titre} />
          </div>
        )}
        <div className="article-hero">
          <a href="/blog/" className="back-link">
            <span aria-hidden="true">&#8592;</span> Retour au blog
          </a>
          <div className="article-hero-meta">
            <span className="article-cat">{article.categorie}</span>
            <span className="article-date">{formatDate(article.date)}</span>
          </div>
          <h1 className="article-title">{article.titre}</h1>
          <p className="article-excerpt">{article.extrait}</p>
        </div>

        {article.contenu && (
          <div className="article-body">
            <PortableText
              value={article.contenu as Parameters<typeof PortableText>[0]["value"]}
              components={portableComponents}
            />
          </div>
        )}
      </article>

      <section className="article-cta">
        <div className="article-cta-inner">
          <h2>Votre projet merite un site a la hauteur</h2>
          <p>
            AlcalSpark cree des sites web sur mesure pour les entreprises
            ambitieuses du Tarn et d&apos;Occitanie. Un projet a la fois,
            100% personalise.
          </p>
          <a href="/contact.html" className="article-cta-btn">
            Demarrer mon projet <span aria-hidden="true">&#8594;</span>
          </a>
        </div>
      </section>
    </>
  );
}
