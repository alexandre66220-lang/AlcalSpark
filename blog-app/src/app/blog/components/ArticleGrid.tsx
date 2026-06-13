"use client";

import { motion } from "framer-motion";
import type { Article } from "../../../../lib/queries";

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
      {articles.map((article, i) => (
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
          <div className="blog-card-img-placeholder">
            {article.titre.charAt(0)}
          </div>
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
      ))}
    </section>
  );
}
