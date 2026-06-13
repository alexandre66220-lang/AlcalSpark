/**
 * Script d'initialisation Sanity avec 3 articles de demonstration.
 * Usage : node sanity-seed.mjs
 * Prerequis : NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN dans .env.local
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, ".env.local"), "utf-8");
    raw.split("\n").forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
  } catch {
    // .env.local absent, on utilise les variables d'environnement existantes
  }
}

loadEnv();

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const articles = [
  {
    _type: "article",
    titre: "Pourquoi votre entreprise a Castres a besoin d'un site web en 2026",
    slug: { _type: "slug", current: "pourquoi-entreprise-castres-site-web-2026" },
    date: "2026-01-15",
    categorie: "Strategie digitale",
    extrait:
      "En 2026, ne pas avoir de site web revient a etre invisible pour vos clients. Decouvrez pourquoi les entreprises de Castres qui investissent dans leur presence en ligne surpassent leurs concurrents.",
    contenu: [
      {
        _type: "block",
        _key: "intro",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "intro-span",
            text: "En 2026, la question n'est plus de savoir si votre entreprise doit avoir un site web, mais plutot comment en tirer le maximum. Dans le bassin castrais, de nombreuses entreprises locales commencent seulement a comprendre l'enjeu : un site web professionnel est le premier commercial que vous ne payez jamais de vacances.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-1",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-1-span",
            text: "La realite des recherches locales a Castres",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p1-span",
            text: "Selon les donnees Google, plus de 76% des recherches locales aboutissent a une visite en magasin dans les 24 heures. A Castres et dans le Tarn, ce comportement est encore plus marque : les habitants cherchent d'abord en ligne avant de se deplacer. Si vous n'apparaissez pas dans les resultats, c'est votre concurrent qui recupere le client.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-2",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-2-span",
            text: "Un site web, c'est votre vitrine permanente",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p2",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p2-span",
            text: "Contrairement a une boutique physique, votre site est accessible 24h/24 et 7j/7. Un artisan du batiment a Castres qui reussit a capter des demandes de devis a 22h un dimanche soir, c'est possible grace a un site bien concu avec un formulaire de contact clair et une presentation soignee de ses realisations.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-3",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-3-span",
            text: "Combien investir et quel retour attendre ?",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p3",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p3-span",
            text: "Un site web professionnel sur mesure represente un investissement de quelques milliers d'euros, amorti generalement en quelques mois si le site est bien reflechi. AlcalSpark accompagne les entreprises de Castres avec des sites optimises SEO, rapides et pensees pour convertir les visiteurs en clients. Chaque projet est unique, traite avec une attention totale.",
          },
        ],
        markDefs: [],
      },
    ],
  },
  {
    _type: "article",
    titre: "WordPress ou site sur mesure : que choisir pour votre commerce ou artisanat ?",
    slug: { _type: "slug", current: "wordpress-vs-site-sur-mesure-artisan" },
    date: "2026-02-10",
    categorie: "Creation web",
    extrait:
      "WordPress ou developpement sur mesure ? Ce choix impacte directement la performance, la securite et le cout de votre site. Guide complet pour artisans et commercants du Tarn.",
    contenu: [
      {
        _type: "block",
        _key: "intro",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "intro-span",
            text: "Chaque semaine, des artisans et commercants nous posent la meme question : 'Vaut-il mieux faire mon site avec WordPress ou partir sur quelque chose de sur mesure ?' La reponse depend de votre situation, de vos objectifs et de votre budget. Voici notre analyse honnete apres avoir accompagne des dizaines de projets.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-1",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-1-span",
            text: "WordPress : les avantages et les limites reelles",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p1-span",
            text: "WordPress equipe 43% des sites web mondiaux. Cette popularite a ses raisons : interface d'administration accessible, ecosysteme de plugins riche, cout initial souvent inferieur. Mais cette popularite a un prix : WordPress est la cible numero 1 des cyberattaques. Un site non maintenu devient rapidement une porte d'entree pour les hackers. De plus, les themes premium et les plugins s'accumulent, ralentissant parfois considerablement le chargement.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-2",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-2-span",
            text: "Le site sur mesure : investissement ou luxe ?",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p2",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p2-span",
            text: "Un site developpe sur mesure avec des technologies modernes (React, Next.js, Astro) charge en moins d'une seconde, n'a aucune vulnerabilite liee aux plugins tiers et correspond exactement a votre identite visuelle. Il n'y a pas de code inutile, pas de fonctionnalites superflues. Le resultat : de meilleures performances SEO, un meilleur taux de conversion et un site que vous ne changerez pas dans 18 mois parce qu'il sera devenu trop lent.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-3",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-3-span",
            text: "Notre recommandation pour les artisans et PME",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p3",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p3-span",
            text: "Pour un artisan ou un commercant local qui veut un site vitrine efficace, sobre et rapide, le site sur mesure est souvent le meilleur investissement sur le long terme. Pour un blog ou une boutique e-commerce avec de nombreux produits, WordPress ou une solution comme Shopify peut avoir du sens. AlcalSpark etudie votre cas specifique avant de recommander une technologie. L'objectif n'est pas de vendre une solution, mais de vous donner celle qui servira le mieux votre croissance.",
          },
        ],
        markDefs: [],
      },
    ],
  },
  {
    _type: "article",
    titre: "SEO local : comment doubler la visibilite de votre commerce a Mazamet",
    slug: { _type: "slug", current: "seo-local-doubler-visibilite-commerce-mazamet" },
    date: "2026-03-05",
    categorie: "SEO & Referencement",
    extrait:
      "Le SEO local permet aux commerces de Mazamet et du Haut-Languedoc d'apparaitre en tete des recherches Google. Strategies concretes et erreurs a eviter pour dominer votre zone.",
    contenu: [
      {
        _type: "block",
        _key: "intro",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "intro-span",
            text: "Mazamet est une ville a taille humaine, et c'est precisement pour cela que le SEO local y est si efficace. Avec une concurrence souvent moins acharnee qu'a Toulouse ou Montpellier, les commerces du Haut-Languedoc qui investissent correctement dans leur referencement local peuvent dominer leur secteur en quelques mois.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-1",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-1-span",
            text: "Google Business Profile : la base incontournable",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p1-span",
            text: "La fiche Google Business Profile (anciennement Google My Business) est le fondement de votre presence locale. Elle doit etre remplie a 100% : horaires exacts, photos de qualite, description optimisee avec des mots-cles locaux ('plombier Mazamet', 'restaurant Haut-Languedoc'), et surtout des avis clients positifs. Une fiche bien geree peut vous faire apparaitre dans le 'Local Pack', les 3 etablissements qui s'affichent en tete des resultats avec une carte.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-2",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-2-span",
            text: "Les pages locales sur votre site : un levier sous-utilise",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p2",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p2-span",
            text: "La plupart des commerces mazametains n'ont pas de page dediee a leur zone geographique sur leur site. Pourtant, creer une page '/services/mazamet' ou '/plombier-mazamet' avec du contenu de qualite de 500 mots minimum envoie un signal fort a Google : vous etes un acteur local de reference. Ajoutez les donnees structurees LocalBusiness en JSON-LD et vos chances d'apparaitre dans les recherches locales augmentent considerablement.",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "h2-3",
        style: "h2",
        children: [
          {
            _type: "span",
            _key: "h2-3-span",
            text: "Les erreurs qui tuent votre referencement local",
          },
        ],
        markDefs: [],
      },
      {
        _type: "block",
        _key: "p3",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "p3-span",
            text: "Les erreurs les plus courantes : NAP (Nom, Adresse, Telephone) different entre votre site et votre fiche Google, absence de mots-cles locaux dans les balises H1 et meta description, site trop lent (plus de 3 secondes de chargement), et absence de contenu frais. Un blog actif, comme celui que vous lisez en ce moment, est un excellent moyen de montrer a Google que votre site est vivant et pertinent pour les recherches locales.",
          },
        ],
        markDefs: [],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding Sanity avec", articles.length, "articles...");
  for (const article of articles) {
    const existing = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0]._id`,
      { slug: article.slug.current }
    );
    if (existing) {
      console.log(`Article deja present, ignoré : ${article.slug.current}`);
      continue;
    }
    const created = await client.create(article);
    console.log(`Article cree : ${created._id} (${article.slug.current})`);
  }
  console.log("Seed termine.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
