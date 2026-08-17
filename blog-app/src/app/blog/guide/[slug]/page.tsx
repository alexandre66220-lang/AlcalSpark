import type { Metadata } from "next";
import {
  getAllGuideVisuelSlugs,
  getGuideVisuelBySlug,
  urlFor,
} from "../../../../../lib/queries";
import { extractGammaEmbedSrc } from "../../../../../lib/parseGammaEmbed";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const slugs = await getAllGuideVisuelSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const guide = await getGuideVisuelBySlug(params.slug);
  if (!guide) return {};

  return {
    title: guide.titre,
    description: guide.description,
    alternates: {
      canonical: `/blog/guide/${params.slug}/`,
    },
    openGraph: {
      title: guide.titre,
      description: guide.description,
      type: "article",
      publishedTime: guide.date,
      url: `/blog/guide/${params.slug}/`,
      images: guide.imageCouverture
        ? [{ url: urlFor(guide.imageCouverture).width(1200).height(630).url() }]
        : undefined,
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

export default async function GuideVisuelPage({
  params,
}: {
  params: { slug: string };
}) {
  const guide = await getGuideVisuelBySlug(params.slug);
  if (!guide) notFound();

  const embedSrc = extractGammaEmbedSrc(guide.embedGamma);

  const guideJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: guide.titre,
    description: guide.description,
    datePublished: guide.date,
    inLanguage: "fr-FR",
    creator: {
      "@type": "Organization",
      "@id": "https://alcalspark.com/#business",
      name: "AlcalSpark",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd) }}
      />
      <section className="guide-hero">
        <a href="/blog/" className="back-link">
          <span aria-hidden="true">&#8592;</span> Retour au blog
        </a>
        <div className="guide-hero-meta">
          <span className="blog-card-cat blog-card-cat--guide">Guide visuel</span>
          <span className="article-date">{formatDate(guide.date)}</span>
        </div>
        <h1 className="article-title">{guide.titre}</h1>
        <p className="article-excerpt">{guide.description}</p>
      </section>

      <section className="guide-embed">
        {embedSrc ? (
          <div className="guide-embed-frame">
            <iframe
              src={embedSrc}
              title={guide.titre}
              loading="lazy"
              allow="fullscreen"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        ) : (
          <p className="guide-embed-error">
            Ce guide visuel n&apos;a pas pu être chargé pour le moment.
          </p>
        )}
      </section>

      <section className="article-cta">
        <div className="article-cta-inner">
          <h2>Vous avez un problème à résoudre, pas forcément un site à commander.</h2>
          <p>
            Commençons par comprendre votre situation. Si une solution digitale
            est le bon levier, on la conçoit et on la réalise. Sinon, on vous le
            dit clairement.
          </p>
          <a href="/contact.html" className="article-cta-btn">
            Prendre 30 minutes pour en parler <span aria-hidden="true">&#8594;</span>
          </a>
        </div>
      </section>
    </>
  );
}
