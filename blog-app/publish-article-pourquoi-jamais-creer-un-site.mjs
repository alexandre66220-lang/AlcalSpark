/**
 * Publication d'un nouvel article dans Sanity :
 * "Pourquoi nous ne commençons jamais par créer un site"
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
 * Usage : node publish-article-pourquoi-jamais-creer-un-site.mjs
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
  titre: "Pourquoi nous ne commençons jamais par créer un site",
  slug: { _type: "slug", current: "pourquoi-nous-ne-commencons-jamais-par-creer-un-site" },
  date: "2026-08-08",
  categorie: "Strategie digitale",
  extrait:
    "La plupart des prestataires commencent par proposer un site. Chez AlcalSpark, on commence par comprendre votre activité. Voici pourquoi, et ce que ça change concrètement.",
  contenu: [
    b("a7-intro-1", "normal",
      "La première chose que la plupart des prestataires font quand un client les contacte, c'est lui proposer un site."),
    b("a7-intro-2", "normal",
      "Un site vitrine. Un site e-commerce. Une refonte. Un catalogue de formules avec des prix et des délais."),
    b("a7-intro-3", "normal",
      "Chez AlcalSpark, on fait l'inverse."),
    b("a7-intro-4", "normal",
      "Avant d'écrire une seule ligne de code ou de concevoir le moindre écran, on pose des questions. Des questions sur votre activité, vos objectifs, vos vrais freins. Et souvent, ces questions révèlent que le problème n'est pas celui qu'on imaginait au départ."),

    b("a7-h2-1", "h2", "Le cas typique de l'artisan qui voulait un site"),
    b("a7-p1", "normal",
      "Imaginons un électricien basé dans le Tarn. Il contacte un prestataire digital avec une demande claire : il veut un site web, parce que ses concurrents en ont un et qu'il pense que c'est ce qui lui manque pour décrocher plus de chantiers."),
    b("a7-p2", "normal",
      "Un prestataire classique lui propose une formule à 1 200€, lui demande ses couleurs préférées et quelques photos, et lui livre un site trois semaines plus tard."),
    b("a7-p3", "normal",
      "Résultat : six mois après, le site existe. Il est correct visuellement. Mais les chantiers ne viennent pas plus qu'avant."),
    b("a7-p4", "normal",
      "Pourquoi ? Parce que personne n'a posé la bonne question au départ."),
    b("a7-p5", "normal",
      "En creusant un peu, on aurait découvert que cet électricien avait en réalité zéro avis Google, une fiche Google Business Profile incomplète, et que ses concurrents directs apparaissaient systématiquement avant lui sur les recherches locales. Le problème n'était pas l'absence de site, c'était l'absence de visibilité locale. Et ça, un site seul ne le règle pas."),
    b("a7-p6", "normal",
      "La solution aurait pu être : optimiser la fiche GBP, lancer une stratégie d'avis clients, et travailler le SEO local en priorité, avant même de penser à la refonte du site."),
    b("a7-p7", "normal",
      "Ce n'est pas la solution la plus chère. C'est la solution la plus adaptée."),

    b("a7-h2-2", "h2", "Pourquoi la plupart des prestataires ne posent pas ces questions"),
    b("a7-p8", "normal",
      "La réponse est simple : leur modèle économique repose sur la vente de prestations."),
    b("a7-p9", "normal",
      "Une agence vend des sites. Un développeur vend du code. Un consultant SEO vend du référencement. Chacun propose ce qu'il sait faire, pas forcément ce dont vous avez besoin."),
    b("a7-p10", "normal",
      "Ce n'est pas de la mauvaise foi. C'est la conséquence logique d'une organisation en silos, où chaque spécialiste répond à la demande sans questionner si cette demande est la bonne."),
    b("a7-p11", "normal",
      "Le problème, c'est que vous payez pour une solution qui n'est peut-être pas celle qu'il vous faut."),

    b("a7-h2-3", "h2", "Ce qu'on fait à la place"),
    b("a7-p12", "normal",
      "Chez AlcalSpark, chaque projet commence par une phase d'analyse. Pas une réunion de cadrage rapide avant de démarrer le design. Une vraie analyse."),
    b("a7-p13", "normal",
      "On cherche à comprendre comment fonctionne votre entreprise. Quels sont vos leviers de revenus. Où se situe le frein principal. Ce que vos clients cherchent avant de vous contacter. Ce qui se passe après le premier contact."),
    b("a7-p14", "normal",
      "À partir de là, on identifie ce qui a le plus d'impact. Parfois c'est un site. Parfois c'est une automatisation. Parfois c'est une refonte complète de votre parcours commercial digital. Et parfois, la réponse honnête est qu'il n'y a rien à développer pour l'instant, et qu'un autre levier est prioritaire."),
    b("a7-p15", "normal",
      "Le développement vient après. Toujours."),

    b("a7-h2-4", "h2", "Ce que ça change concrètement pour vous"),
    b("a7-p16", "normal",
      "Quand l'analyse précède la réalisation, vous évitez de payer pour quelque chose qui ne résoudra pas votre problème. Vous investissez dans ce qui a réellement de l'impact sur votre activité. Et vous travaillez avec quelqu'un qui comprend votre entreprise avant de vous proposer quoi que ce soit."),
    b("a7-p17", "normal",
      "Ce n'est pas une approche plus lente. C'est une approche qui évite de recommencer dans six mois."),

    b("a7-h2-5", "h2", "Comment ça se passe en pratique"),
    b("a7-p18", "normal",
      "Le point de départ, chez AlcalSpark, c'est une session de consultation de 1h. On analyse votre situation, on identifie vos leviers prioritaires, et vous repartez avec un plan d'action concret, que vous décidiez de travailler avec nous ou non."),
    b("a7-p19", "normal",
      "Si une réalisation technique est la bonne réponse, on la conçoit et on la développe nous-mêmes. Un seul interlocuteur, du diagnostic au déploiement."),
    b("a7-p20", "normal",
      "Si ce n'est pas le cas, on vous le dit clairement. Et on vous oriente vers ce qui sera vraiment utile."),
    b("a7-p21", "normal",
      "C'est ça, travailler avec un studio stratégique plutôt qu'avec un prestataire qui vend des sites."),

    // Conclusion en italique, avec lien vers /contact sur une partie du texte
    {
      _type: "block",
      _key: "a7-cta",
      style: "normal",
      markDefs: [{ _key: "a7-link-contact", _type: "link", href: "/contact" }],
      children: [
        {
          _type: "span",
          _key: "a7-cta-s1",
          marks: ["em"],
          text: "Vous pensez avoir besoin d'un site, d'une automatisation ou d'une refonte ? Commençons par vérifier si c'est vraiment le bon levier. ",
        },
        {
          _type: "span",
          _key: "a7-cta-s2",
          marks: ["em", "a7-link-contact"],
          text: "Prendre 30 minutes pour en parler",
        },
        {
          _type: "span",
          _key: "a7-cta-s3",
          marks: ["em"],
          text: ".",
        },
      ],
    },
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
