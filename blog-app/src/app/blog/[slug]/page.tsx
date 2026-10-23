import type { Metadata } from "next";
import { PortableText } from "@portabletext/react";
import { getAllSlugs, getArticleBySlug } from "../../../../lib/queries";
import { readingTime } from "../../../../lib/readingTime";
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

/** Texte brut d'un bloc Portable Text. */
function blockText(b: unknown): string {
  const children = (b as { children?: Array<{ text?: string }> }).children;
  return (children ?? []).map((c) => c.text ?? "").join("");
}

/** Ancre d'un titre : minuscules, sans accents, tirets. Sert aux liens du sommaire (#ancre). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function childrenText(children?: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map((c) => childrenText(c as React.ReactNode)).join("");
  return "";
}

/** Questions/réponses d'une section H2 "FAQ" (H3 = question, paragraphes = réponse), pour le JSON-LD FAQPage. */
function extractFaq(contenu?: unknown[]): Array<{ q: string; a: string }> {
  if (!contenu) return [];
  const faq: Array<{ q: string; a: string }> = [];
  let inFaq = false;
  for (const raw of contenu) {
    const b = raw as { _type?: string; style?: string };
    if (b._type !== "block") continue;
    const text = blockText(b).trim();
    if (b.style === "h2") {
      inFaq = /^(faq|questions fr[ée]quentes)$/i.test(text);
      continue;
    }
    if (!inFaq) continue;
    if (b.style === "h3") faq.push({ q: text, a: "" });
    else if (faq.length && text) faq[faq.length - 1].a += (faq[faq.length - 1].a ? " " : "") + text;
  }
  return faq.filter((f) => f.a);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return {};

  const title = article.titreSeo || article.titre;
  const image = ARTICLE_IMAGES[params.slug] ?? "/assets/og-cover.jpg";

  return {
    // titreSeo est un titre complet (60 caractères max) : pas de suffixe de marque ajouté.
    title: article.titreSeo ? { absolute: article.titreSeo } : article.titre,
    description: article.extrait,
    alternates: {
      canonical: `/blog/${params.slug}/`,
    },
    openGraph: {
      title,
      description: article.extrait,
      type: "article",
      publishedTime: article.date,
      url: `/blog/${params.slug}/`,
      siteName: "AlcalSpark Blog",
      locale: "fr_FR",
      images: [{ url: image, width: 1200, height: 630, alt: article.titre }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: article.extrait,
      images: [image],
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
    h2: ({ children }: { children?: React.ReactNode }) => <h2 id={slugify(childrenText(children))}>{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 id={slugify(childrenText(children))}>{children}</h3>,
    normal: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote>{children}</blockquote>
    ),
  },
  marks: {
    link: ({
      children,
      value,
    }: {
      children?: React.ReactNode;
      value?: { href?: string };
    }) => (
      <a href={value?.href} target={value?.href?.startsWith("http") ? "_blank" : undefined} rel={value?.href?.startsWith("http") ? "noopener" : undefined}>
        {children}
      </a>
    ),
  },
  types: {
    codeBlock: ({
      value,
    }: {
      value?: { code?: string; language?: string };
    }) => (
      <pre className="article-code">
        <code>{value?.code}</code>
      </pre>
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
    dateModified: article.date,
    author: {
      "@type": "Person",
      name: "Alexandre Lenique",
      url: "https://alcalspark.com/about",
    },
    publisher: {
      "@type": "ProfessionalService",
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

  const faq = extractFaq(article.contenu);
  const faqJsonLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://alcalspark.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://alcalspark.com/blog/" },
      { "@type": "ListItem", position: 3, name: article.titre, item: `https://alcalspark.com/blog/${params.slug}/` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
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
            <span className="article-reading">{readingTime(article.contenu)} min de lecture</span>
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
          <h2>Vous avez un problème à résoudre, pas forcément un site à commander.</h2>
          <p>
            Commençons par comprendre votre situation. Si une solution digitale
            est le bon levier, on la conçoit et on la réalise. Sinon, on vous le
            dit clairement.
          </p>
          <a href="/contact" className="article-cta-btn">
            Décrire mon besoin par écrit <span aria-hidden="true">&#8594;</span>
          </a>
          <p className="article-cta-links">
            Voir aussi : <a href="/tarifs">tarifs et packs</a>,{" "}
            <a href="/services/automatisation-ia">automatisation IA</a>,{" "}
            <a href="/agences">offre agences (marque blanche)</a>.
          </p>
        </div>
      </section>
    </>
  );
}
