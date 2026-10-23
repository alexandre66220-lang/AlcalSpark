/**
 * Publication d'un nouvel article dans Sanity :
 * "Sous-traiter l'intégration Figma → code : prix, process et pièges à éviter"
 *
 * Même pipeline que publish-article-pourquoi-jamais-creer-un-site.mjs : le blog est une app
 * Next.js connectée à Sanity (blog-app/). Publier ce document suffit pour que l'article
 * apparaisse sur /blog/ (carte + page) et dans /blog/sitemap.xml (lastmod = champ "date").
 * Il n'existe pas de version EN du blog : article publié en français uniquement.
 *
 * Particularités de cet article (gérées par le gabarit src/app/blog/[slug]/page.tsx) :
 *  - titreSeo : balise <title> courte (60 caractères max), le titre reste l'H1 ;
 *  - sommaire : liens #ancre vers les H2 (le gabarit pose un id sur chaque H2/H3) ;
 *  - FAQ : la section H2 "FAQ" (H3 = question, paragraphes = réponse) alimente le JSON-LD FAQPage ;
 *  - auteur du JSON-LD : Alexandre Lenique.
 *
 * Prerequis : NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET et SANITY_API_TOKEN
 * (droits d'ecriture) en variables d'environnement, ou dans blog-app/.env.local (non commite).
 *
 * Usage : node publish-article-sous-traiter-integration-figma-code.mjs          (publie)
 *         node publish-article-sous-traiter-integration-figma-code.mjs --dry    (affiche mots, titres, sans rien publier)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry");

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

// Blocs Portable Text. Marquage inline : [libellé](lien) et **gras**.
let n = 0;
function spans(text, key, markDefs) {
  const out = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0, m, i = 0;
  const push = (t, marks) => t && out.push({ _type: "span", _key: `${key}-s${i++}`, text: t, ...(marks ? { marks } : {}) });
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[1]) {
      const defKey = `${key}-l${i}`;
      markDefs.push({ _key: defKey, _type: "link", href: m[2] });
      push(m[1], [defKey]);
    } else push(m[3], ["strong"]);
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return out;
}
function block(style, text, extra = {}) {
  const key = `fc${++n}`;
  const markDefs = [];
  const children = spans(text, key, markDefs);
  return { _type: "block", _key: key, style, children, markDefs, ...extra };
}
const h2 = (t) => block("h2", t);
const h3 = (t) => block("h3", t);
const p = (t) => block("normal", t);
const quote = (t) => block("blockquote", t);
const li = (t, type = "bullet") => block("normal", t, { listItem: type, level: 1 });

const MAIL = "mailto:contact@alcalspark.com?subject=Collaboration%20%2F%20sous-traitance";

const contenu = [
  quote(
    "**En bref.** Sous-traiter l'intégration Figma vers code a du sens quand votre équipe manque de temps ou de compétences front-end sur un projet donné. Le prix dépend du nombre de pages, des composants réutilisables, des animations et des intégrations : chez ALCALSPARK, une intégration se situe entre 350 et 600 € selon le nombre de pages. Pour que ça se passe bien, il faut des maquettes propres (composants, variables, états, versions mobile et desktop), un périmètre écrit et tous les contenus. Vous obtenez en retour du HTML, CSS et JavaScript propre, responsive et performant, que vous pouvez reprendre sous votre marque."
  ),
  h2("Sommaire"),
  li("[Quand sous-traiter l'intégration](#quand-sous-traiter-l-integration)"),
  li("[Ce qu'est une bonne maquette prête à intégrer](#ce-qu-est-une-bonne-maquette-prete-a-integrer)"),
  li("[Ce qu'inclut une intégration propre](#ce-qu-inclut-une-integration-propre)"),
  li("[Comment se construit le prix](#comment-se-construit-le-prix)"),
  li("[Processus type](#processus-type)"),
  li("[Erreurs fréquentes](#erreurs-frequentes)"),
  li("[Marque blanche et confidentialité](#marque-blanche-et-confidentialite)"),
  li("[FAQ](#faq)"),

  h2("Quand sous-traiter l'intégration"),
  p("Une agence ou un freelance qui revend du web vend d'abord de la conception, du conseil et de la relation client. L'intégration, c'est-à-dire la transformation des maquettes en pages qui fonctionnent dans un navigateur, est une étape technique qui demande du temps et une vraie maîtrise du HTML, du CSS et du JavaScript. Sous-traiter cette étape est un choix d'organisation, pas un aveu de faiblesse."),
  p("Plusieurs situations s'y prêtent bien :"),
  li("**Un pic de charge.** Vous avez signé plusieurs projets en même temps et l'équipe de production est saturée."),
  li("**Un manque de compétence ponctuel.** Votre équipe est forte en design ou en back-end, mais pas en intégration front soignée."),
  li("**Un projet unique.** Recruter pour un seul site n'a pas de sens, alors qu'un prestataire peut intervenir sur la durée du projet."),
  li("**Un besoin de régularité.** Vous voulez une qualité de code stable d'un projet à l'autre, sans dépendre d'une seule personne en interne."),
  p("À l'inverse, sous-traiter est risqué quand les maquettes ne sont pas validées par votre client. Chaque changement de direction en cours d'intégration coûte du temps et complique le périmètre. Mieux vaut figer les écrans avant d'envoyer le dossier."),

  h2("Ce qu'est une bonne maquette prête à intégrer"),
  p("La qualité d'une intégration dépend en grande partie de celle des maquettes. Un fichier Figma bien construit se lit comme une spécification : l'intégrateur n'a pas à deviner. Voici ce qu'il faut vérifier avant l'envoi."),
  h3("Auto-layout et structure claire"),
  p("Les écrans construits avec l'auto-layout traduisent directement la logique de mise en page : alignements, espacements, comportement quand le contenu s'allonge. Des calques nommés, rangés par sections (en-tête, héros, bloc de contenu, pied de page), évitent les allers-retours de questions."),
  h3("Composants, variables et styles"),
  p("Un bouton qui existe comme composant, avec ses variantes, devient une seule classe CSS réutilisable. Les couleurs, les polices et les tailles de texte définies comme variables et styles Figma se retrouvent telles quelles dans le code, sous forme de variables CSS. Sans cela, chaque valeur doit être relevée à la main, et les écarts s'accumulent."),
  h3("Des espacements cohérents"),
  p("Une échelle d'espacement régulière (par exemple des multiples de 4 ou de 8 pixels) rend le code plus simple et le rendu plus stable. Des marges différentes à chaque écran obligent à créer des exceptions, qui sont autant de sources de bugs."),
  h3("Les états des boutons et des formulaires"),
  p("Un écran statique ne dit pas ce qui se passe au survol, au clic, au focus clavier, ni quand un champ est en erreur. Prévoyez au minimum les états par défaut, survol, focus, désactivé et erreur pour les boutons et les champs, ainsi que le message de confirmation d'un formulaire envoyé."),
  h3("Des maquettes mobile et desktop"),
  p("Une page se consulte aujourd'hui sur des écrans de toutes tailles. Fournissez au moins une version mobile et une version desktop de chaque page type, et précisez ce qui change entre les deux (menu, grilles, ordre des blocs). Sans version mobile, l'intégrateur doit improviser, et vous découvrirez le résultat trop tard."),

  h2("Ce qu'inclut une intégration propre"),
  p("« Intégrer » ne veut pas dire seulement reproduire un écran à l'identique. Une intégration propre est un livrable que vous pouvez reprendre, faire évoluer et mettre en ligne sans mauvaise surprise. Elle comprend au minimum :"),
  li("**Un HTML sémantique.** Des balises qui décrivent le contenu (titres hiérarchisés, listes, navigation, formulaires avec leurs libellés), utiles pour la lisibilité du code, l'accessibilité et le référencement."),
  li("**Un rendu responsive.** Une mise en page qui s'adapte aux différentes largeurs d'écran, testée sur les tailles courantes."),
  li("**Une accessibilité de base.** Contrastes suffisants, texte alternatif sur les images, focus clavier visible, champs de formulaire étiquetés."),
  li("**Des performances soignées.** Images dimensionnées et compressées, CSS et JavaScript limités à ce qui est utile, peu de dépendances externes."),
  li("**Un SEO technique propre.** Une balise title et une meta description par page, un seul H1, des titres bien ordonnés, des URL lisibles."),
  p("Chez ALCALSPARK, l'intégration livrée est du HTML, CSS et JavaScript propre, responsive et performant, pensé pour être repris par votre équipe. Si vos formulaires doivent ensuite alimenter un tableur, envoyer un email de confirmation ou prévenir un commercial, c'est un chantier distinct : une [automatisation](/services/automatisation-ia) peut s'ajouter à l'intégration."),

  h2("Comment se construit le prix"),
  p("Le prix d'une intégration n'est pas un tarif au pixel. Il reflète le temps nécessaire pour produire un code fiable, et il dépend surtout de quatre éléments."),
  li("**Le nombre de pages.** Une page est un écran à construire et à tester. Plusieurs pages basées sur le même gabarit coûtent moins cher que des pages toutes différentes."),
  li("**Les composants réutilisables.** Un site construit avec peu de composants bien définis est plus rapide à intégrer qu'un site où chaque bloc est unique."),
  li("**Les animations.** Un simple effet de survol n'a pas le même coût qu'une animation au défilement ou une scène sur mesure. Listez-les dans le brief plutôt que de les laisser dans les maquettes."),
  li("**Les intégrations.** Formulaires, outils de mesure d'audience, cartes, vidéos : chaque brique externe ajoute du travail de configuration et de test."),
  p("La qualité du fichier Figma joue aussi : des maquettes propres réduisent le temps passé à interpréter, donc le prix."),
  p("À titre d'exemple, chez ALCALSPARK, l'intégration Figma vers code en marque blanche est facturée de 350 à 600 € par intégration, selon le nombre de pages (TVA non applicable, art. 293 B du CGI). C'est une fourchette propre à notre studio, pas un barème du marché. Le prix exact est annoncé dans un devis avant de démarrer. Pour comparer avec nos autres offres, la page [Tarifs](/tarifs) détaille les packs de création de site."),

  h2("Processus type"),
  p("Un bon processus de sous-traitance tient en trois étapes, sans réunion inutile :"),
  li("**Envoi des maquettes.** Vous partagez le fichier Figma en lecture, le nombre de pages, les contenus disponibles et vos contraintes (navigateurs, outils de mesure, délai souhaité).", "number"),
  li("**Devis sous 24 h.** Vous recevez un prix dans la fourchette annoncée et un planning, avant tout démarrage.", "number"),
  li("**Livraison.** Le code vous est remis, propre et prêt à être repris sous votre marque. Le nombre de tours de retouches est précisé dans le devis.", "number"),
  p("Notre offre pour les agences est détaillée sur la page [Agences](/agences) : tout se déroule à distance, par écrit."),

  h2("Erreurs fréquentes"),
  h3("Des maquettes sans états"),
  p("Les écrans sont beaux mais ne montrent ni survol, ni erreur de formulaire, ni menu ouvert. L'intégrateur choisit alors à votre place, et votre client découvre ces choix à la recette."),
  h3("Pas de version mobile"),
  p("C'est l'erreur la plus coûteuse : le comportement sur téléphone est inventé après coup, et il faut parfois repenser des blocs entiers."),
  h3("Un contenu manquant"),
  p("Textes provisoires, images absentes, icônes à produire : chaque élément manquant bloque la livraison ou oblige à revenir sur la mise en page. Envoyez les contenus avec les maquettes, ou signalez clairement ce qui reste à fournir."),
  h3("Des retours de modifications sans périmètre"),
  p("Sans périmètre écrit, chaque retour est une négociation. Définissez ce qui est inclus (nombre de pages, nombre de tours de retouches) et traitez toute demande hors périmètre comme un complément, avec son devis."),

  h2("Marque blanche et confidentialité"),
  p("Sous-traiter en marque blanche signifie que votre client ne voit que votre agence. Le sous-traitant n'est pas cité, ne communique pas avec votre client et ne signe pas le livrable. Cela suppose un cadre clair : un interlocuteur unique côté sous-traitance, des échanges par écrit, et la possibilité de signer un accord de confidentialité (NDA) avant de recevoir les maquettes."),
  p("ALCALSPARK travaille 100 % à distance et peut signer un NDA sur demande. Pensez aussi à retirer des fichiers ce qui n'a pas à être partagé (données personnelles réelles, identifiants, contenus sous embargo)."),

  h2("FAQ"),
  h3("Combien coûte une intégration Figma vers code ?"),
  p("Cela dépend du nombre de pages, des composants, des animations et des intégrations. Chez ALCALSPARK, l'intégration en marque blanche est facturée de 350 à 600 € par intégration, avec un devis annoncé sous 24 h après réception des maquettes."),
  h3("Quel délai prévoir ?"),
  p("Le planning est annoncé dans le devis, après réception des maquettes : il dépend principalement du nombre de pages et de la complexité des composants."),
  h3("Faut-il un accord de confidentialité ?"),
  p("Ce n'est pas obligatoire, mais c'est courant en marque blanche. Un NDA peut être signé avant l'envoi des maquettes si vous le demandez."),
  h3("Les animations sont-elles comprises ?"),
  p("Elles influencent le prix. Listez-les dans le brief, avec leur comportement attendu, pour qu'elles soient prises en compte dans le devis."),
  h3("Que se passe-t-il si les maquettes changent en cours de route ?"),
  p("Les changements hors périmètre sont traités comme un complément, avec un devis séparé. C'est la raison pour laquelle il vaut mieux faire valider les maquettes par votre client avant de les envoyer."),

  p("**Vous avez des maquettes à intégrer ?** Envoyez-nous le lien Figma et le nombre de pages : [écrivez à contact@alcalspark.com](" + MAIL + "). Vous recevez un devis sous 24 h."),
];

const article = {
  _type: "article",
  titre: "Sous-traiter l'intégration Figma → code : prix, process et pièges à éviter",
  titreSeo: "Sous-traiter l'intégration Figma vers code : prix, pièges",
  slug: { _type: "slug", current: "sous-traiter-integration-figma-code" },
  date: "2026-10-23",
  categorie: "Création web",
  extrait:
    "Quand sous-traiter l'intégration Figma vers code, comment préparer vos maquettes, quel prix (350 à 600 € chez ALCALSPARK) et quels pièges éviter.",
  contenu,
};

function stats() {
  const text = contenu.map((b) => b.children.map((c) => c.text).join("")).join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return { words, h2: contenu.filter((b) => b.style === "h2").length, h3: contenu.filter((b) => b.style === "h3").length };
}

async function publish() {
  loadEnv();
  const { createClient } = await import("@sanity/client");
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2024-01-01",
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });
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

if (DRY) {
  console.log(JSON.stringify({ titre: article.titre, titreSeo: article.titreSeo, extraitLength: article.extrait.length, titreSeoLength: article.titreSeo.length, ...stats() }, null, 2));
} else {
  publish().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
