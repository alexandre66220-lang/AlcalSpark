"use client";

import { motion } from "framer-motion";
import type { Article } from "../../../../lib/queries";

const ARTICLE_IMAGES: Record<string, string> = {
  "pourquoi-entreprise-castres-site-web-2026":
    "/assets/lucid-origin_Cinematic_close-up_of_a_smartphone_screen_reflecting_gold_light_in_a_dark_modern-0.jpg",
  "wordpress-vs-site-sur-mesure-artisan":
    "/assets/lucid-origin_Abstract_split_composition_one_side_showing_generic_template_grid_patterns_in_mu-0.jpg",
  "seo-local-doubler-visibilite-commerce-mazamet":
    "/assets/lucid-origin_Cinematic_aerial_view_of_a_small_French_town_at_dusk_warm_golden_street_lights_d-0.jpg",
  "combien-coute-site-web-artisan-occitanie":
    "/assets/lucid-origin_a_cinematic_photo_of_Abstract_visualization_of_web_design_pricing_tiers_three_gl-0.jpg",
  "5-signes-site-web-fait-fuir-clients":
    "/assets/lucid-origin_a_cinematic_photo_of_Frustrated_business_owner_looking_at_an_old_laptop_blurred_-0.jpg",
  "seo-local-apparaitre-premier-google-clients-pres-de-chez-vous":
    "/assets/gpt-image-2_Close-up_of_a_smartphone_screen_showing_Google_search_results_for_a_local_busine-0.jpg",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export function ArticleGrid({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <section className="blog-grid">
        <p style={{ color: "var(--muted)", gridColumn: "1/-1" }}>
          Aucun article pour le moment. Revenez bientot.
        </p>
      </section>
    );
  }

  return (
    <section className="blog-grid">
      {articles.map((article, i) => {
        const imgSrc = ARTICLE_IMAGES[article.slug.current];
        return (
          <motion.a
            key={article._id}
            href={`/blog/${article.slug.current}/`}
            className="blog-card"
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={cardVariants}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={article.titre}
                className="blog-card-img"
              />
            ) : (
              <div className="blog-card-img-placeholder">
                {article.titre.charAt(0)}
              </div>
            )}
            <div className="blog-card-body">
              <div className="blog-card-meta">
                <span className="blog-card-cat">{article.categorie}</span>
                <span className="blog-card-date">{formatDate(article.date)}</span>
              </div>
              <h2 className="blog-card-title">{article.titre}</h2>
              <p className="blog-card-excerpt">{article.extrait}</p>
              <span className="blog-card-link">
                Lire l&apos;article <span aria-hidden="true">&#8594;</span>
              </span>
            </div>
          </motion.a>
        );
      })}
    </section>
  );
}
