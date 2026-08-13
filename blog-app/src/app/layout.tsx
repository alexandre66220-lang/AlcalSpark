import type { Metadata } from "next";
import { Cormorant_Garamond, Raleway } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-raleway",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://alcalspark.com"),
  title: {
    default: "Blog - AlcalSpark | Studio stratégique",
    template: "%s | AlcalSpark Blog",
  },
  description:
    "Conseils, stratégies digitales et expertises web par AlcalSpark, studio stratégique basé à Mazamet.",
  openGraph: {
    siteName: "AlcalSpark Blog",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/assets/og-cover.jpg",
        width: 1200,
        height: 630,
        alt: "AlcalSpark, studio stratégique à Mazamet dans le Tarn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://alcalspark.com/#business",
  name: "AlcalSpark",
  description:
    "Studio stratégique à Mazamet (Tarn) : analyse stratégique, identification des leviers de croissance, puis conception et réalisation de systèmes digitaux (sites de conversion, SaaS, automatisation) pour PME et artisans d'Occitanie",
  url: "https://alcalspark.com",
  telephone: "+33663054481",
  email: "contact@alcalspark.com",
  foundingDate: "2026",
  address: {
    "@type": "PostalAddress",
    streetAddress: "90 avenue Georges Guynemer",
    addressLocality: "Mazamet",
    postalCode: "81200",
    addressRegion: "Occitanie",
    addressCountry: "FR",
  },
  areaServed: [
    { "@type": "City", name: "Castres" },
    { "@type": "City", name: "Mazamet" },
    { "@type": "City", name: "Albi" },
    { "@type": "City", name: "Toulouse" },
    { "@type": "AdministrativeArea", name: "Occitanie" },
  ],
  priceRange: "€€€",
  sameAs: ["https://www.instagram.com/alcalspark/"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${raleway.variable}`}>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-GH6PR00V1L" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-GH6PR00V1L');`,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        {/* Menu mobile : bascule CSS pure (case a cocher), sans JS, pour
            ne pas dependre de l'hydratation React. La case et le nav
            vivent HORS du <header> : le header a un backdrop-filter, qui
            cree un nouveau containing block pour tout descendant en
            position:fixed (le nav se retrouverait alors coince dans les
            64px du header au lieu de couvrir l'ecran). Le combinateur ~
            fonctionne quand meme, la case et le nav restent freres
            directs de <body>. */}
        <input
          type="checkbox"
          id="blog-nav-toggle"
          className="blog-nav-toggle-input"
          aria-hidden="true"
        />
        <header className="blog-header">
          <div className="blog-header-inner">
            <a href="/" className="blog-logo" aria-label="AlcalSpark, Accueil">
              Alcal<em>Spark</em>
            </a>
            <label
              htmlFor="blog-nav-toggle"
              className="blog-nav-toggle-label"
              role="button"
              aria-label="Ouvrir le menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </label>
            <nav className="blog-nav blog-nav-desktop">
              <a href="/">Accueil</a>
              <a href="/services.html">Services</a>
              <a href="/tarifs.html">Tarifs</a>
              <a href="/portfolio.html">Portfolio</a>
              <a href="/about.html">À propos</a>
              <a href="/blog/" aria-current="page">
                Blog
              </a>
              <a href="/produits.html">Produits</a>
              <a href="/contact.html" className="blog-nav-cta">
                Démarrer un projet
              </a>
            </nav>
          </div>
        </header>
        <nav className="blog-nav blog-nav-mobile">
          <a href="/">Accueil</a>
          <a href="/services.html">Services</a>
          <a href="/tarifs.html">Tarifs</a>
          <a href="/portfolio.html">Portfolio</a>
          <a href="/about.html">À propos</a>
          <a href="/blog/" aria-current="page">
            Blog
          </a>
          <a href="/produits.html">Produits</a>
          <a href="/contact.html" className="blog-nav-cta">
            Démarrer un projet
          </a>
        </nav>
        <main>{children}</main>
        <footer className="blog-footer">
          <div className="blog-footer-inner">
            <p>
              &copy; {new Date().getFullYear()} AlcalSpark. Studio stratégique.
            </p>
            <nav>
              <a href="/mentions-legales.html">Mentions legales</a>
              <a href="/contact.html">Contact</a>
              <a href="/blog/">Blog</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
