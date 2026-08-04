/**
 * Publication d'un nouvel article dans Sanity :
 * "5 signaux qui doivent vous faire raccrocher (démarchage site web et référencement)"
 *
 * Le blog est une app Next.js connectée à Sanity (blog-app/), pas un
 * dossier de fichiers .html statiques : publier ce document suffit pour
 * que l'article apparaisse automatiquement sur /blog/ (carte + page) et
 * dans /blog/sitemap.xml (lastmod = champ "date" ci-dessous), sans aucune
 * autre modification manuelle.
 *
 * Prerequis : NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
 * et SANITY_API_TOKEN (droits d'ecriture) disponibles en variables
 * d'environnement, ou dans blog-app/.env.local (non commite).
 *
 * Usage : node publish-article-demarchage-arnaques.mjs
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
    // .env.local absent, variables d'environnement existantes utilisees
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

function b(key, style, text) {
  return {
    _type: "block",
    _key: key,
    style,
    children: [{ _type: "span", _key: key + "-s", text }],
    markDefs: [],
  };
}

const article = {
  _type: "article",
  titre: "5 signaux qui doivent vous faire raccrocher (démarchage site web et référencement)",
  slug: { _type: "slug", current: "5-signaux-alerte-demarchage-site-web-referencement" },
  date: "2026-08-04",
  categorie: "Strategie digitale",
  extrait:
    "Agences qui appellent avec un site gratuit ou un référencement Google garanti : les signaux d'alerte à repérer, et comment réagir si vous avez déjà signé.",
  contenu: [
    b("d-intro", "normal",
      "Beaucoup d'artisans et de commerçants du Tarn reçoivent des appels d'agences ou d'annuaires professionnels proposant un site gratuit ou un référencement Google garanti. Certaines de ces offres cachent un engagement pluriannuel coûteux, présenté comme une simple mise à jour. Voici comment les repérer."),

    b("d-h2-1", "h2", "Le référencement garanti n'existe pas"),
    b("d-p1", "normal",
      "Aucune agence sérieuse ne peut garantir une position sur Google, l'algorithme ne le permet pas. C'est le premier signal d'alerte à retenir."),

    b("d-h2-2", "h2", "Le site gratuit qui cache un abonnement"),
    b("d-p2", "normal",
      "Un site présenté comme gratuit s'accompagne souvent d'un contrat de maintenance ou d'hébergement pluriannuel, à un tarif largement supérieur au marché, avec des clauses de reconduction automatique difficiles à repérer au téléphone."),

    b("d-h2-3", "h2", "5 signaux qui doivent vous faire raccrocher"),
    b("d-p3", "normal",
      "Démarchage téléphonique non sollicité juste après une immatriculation au RCS ou au RM, insistance pour signer le jour même, refus d'envoyer le contrat par écrit avant signature, mention de mise à jour gratuite qui engage en réalité sur plusieurs années, pression ou urgence artificielle dans le discours commercial."),

    b("d-h2-4", "h2", "Vous avez déjà signé ? Ce que vous pouvez faire"),
    b("d-p4", "normal",
      "Un droit de rétractation de 14 jours existe pour toute vente à distance à un professionnel de moins de 5 salariés. Passé ce délai, relisez le contrat pour vérifier la clause de reconduction et le préavis de résiliation. En cas de doute, la CCI du Tarn ou un conseiller juridique gratuit peut vous aider à analyser le contrat avant toute démarche."),

    b("d-cta", "normal",
      "Chez AlcalSpark, chaque devis est transparent et sans engagement caché : vous savez exactement ce que vous payez, sans clause dissimulée ni reconduction automatique. Une question sur une offre reçue ou sur votre projet de site web ? Contactez-nous sur alcalspark.com/contact."),
  ],
};

async function publish() {
  const existing = await client.fetch(
    `*[_type == "article" && slug.current == $slug][0]._id`,
    { slug: article.slug.current }
  );
  if (existing) {
    console.log(`Article deja present, ignore : ${article.slug.current}`);
    return;
  }
  const created = await client.create(article);
  console.log(`Article cree : ${created._id} - ${article.titre}`);
}

publish().catch((err) => {
  console.error(err);
  process.exit(1);
});
