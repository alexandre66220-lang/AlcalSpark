"use client";

import { motion } from "framer-motion";
import type { BlogListItem } from "../../../../lib/queries";
import { urlFor } from "../../../../lib/queries";
import { readingTime } from "../../../../lib/readingTime";

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

export function ArticleGrid({ articles }: { articles: BlogListItem[] }) {
  if (articles.length === 0) {
    return (
      <section className="blog-grid">
        <p style={{ color: "var(--muted)", gridColumn: "1/-1" }}>
          Aucun article pour le moment. Revenez bientôt.
        </p>
      </section>
    );
  }

  return (
    <section className="blog-grid">
      {articles.map((item, i) => {
        if (item._type === "guideVisuel") {
          const imgSrc = item.imageCouverture
            ? urlFor(item.imageCouverture).width(800).height(450).fit("crop").url()
            : undefined;
          return (
            <motion.a
              key={item._id}
              href={`/blog/guide/${item.slug.current}/`}
              className="blog-card"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
            >
              {imgSrc ? (
                <img src={imgSrc} alt={item.titre} className="blog-card-img" />
              ) : (
                <div className="blog-card-img-placeholder">
                  {item.titre.charAt(0)}
                </div>
              )}
              <div className="blog-card-body">
                <div className="blog-card-meta">
                  <span className="blog-card-cat blog-card-cat--guide">
                    Guide visuel
                  </span>
                  <span className="blog-card-date">{formatDate(item.date)}</span>
                </div>
                <h2 className="blog-card-title">{item.titre}</h2>
                <p className="blog-card-excerpt">{item.description}</p>
                <span className="blog-card-link">
                  Voir le guide <span aria-hidden="true">&#8594;</span>
                </span>
              </div>
            </motion.a>
          );
        }

        const imgSrc = ARTICLE_IMAGES[item.slug.current];
        return (
          <motion.a
            key={item._id}
            href={`/blog/${item.slug.current}/`}
            className="blog-card"
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={cardVariants}
          >
            {imgSrc ? (
              <img src={imgSrc} alt={item.titre} className="blog-card-img" />
            ) : (
              <div className="blog-card-img-placeholder">
                {item.titre.charAt(0)}
              </div>
            )}
            <div className="blog-card-body">
              <div className="blog-card-meta">
                <span className="blog-card-cat">{item.categorie}</span>
                <span className="blog-card-date">{formatDate(item.date)}</span>
                <span className="blog-card-reading">{readingTime(item.contenu)} min</span>
              </div>
              <h2 className="blog-card-title">{item.titre}</h2>
              <p className="blog-card-excerpt">{item.extrait}</p>
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
