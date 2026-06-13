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
  title: {
    default: "Blog - AlcalSpark | Studio web premium",
    template: "%s | AlcalSpark Blog",
  },
  description:
    "Conseils, strategies digitales et expertises web par AlcalSpark, studio de creation web premium base a Mazamet.",
  openGraph: {
    siteName: "AlcalSpark Blog",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${raleway.variable}`}>
      <body>
        <header className="blog-header">
          <div className="blog-header-inner">
            <a href="/" className="blog-logo">
              AlcalSpark
            </a>
            <nav className="blog-nav">
              <a href="/">Accueil</a>
              <a href="/services.html">Services</a>
              <a href="/portfolio.html">Portfolio</a>
              <a href="/blog/" aria-current="page">
                Blog
              </a>
              <a href="/contact.html" className="blog-nav-cta">
                Nous contacter
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="blog-footer">
          <div className="blog-footer-inner">
            <p>
              &copy; {new Date().getFullYear()} AlcalSpark. Studio web premium.
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
