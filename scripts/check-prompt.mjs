#!/usr/bin/env node
/**
 * Verifie que le prompt systeme de SPARK reste coherent avec site.config.json.
 * Lance par build.sh (et `npm run lint`). Code de sortie 1 si un controle echoue.
 *
 *  1. Le prompt se construit (aucun jeton inconnu ou vide).
 *  2. Il contient les valeurs reelles de la config (grille de prix, delais, capacite,
 *     mention fiscale si renseignee) et aucun {{jeton}} restant.
 *  3. Il ne reintroduit pas de valeurs perimees ecrites en dur : ancien prix
 *     "des 700", horaires de rappel, "consultation gratuite", WooCommerce/Shopify/Zapier,
 *     "un projet a la fois", ni un montant en dur (les montants doivent venir des jetons).
 *  4. Les marqueurs CTA documentes sont ceux que le frontend sait lire.
 *  5. Delais et prix secondaires : valeurs de la config presentes, jamais ecrits en dur,
 *     et identiques a ceux publies sur les pages du site (offre, tarifs, n8n, zones).
 *  6. Pas de tiret cadratin / demi-cadratin / double tiret dans le texte envoye au modele.
 */
import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf-8"));
const { buildSystemPrompt } = require(join(ROOT, "netlify/functions/utils/build-prompt.js"));
const template = readFileSync(join(ROOT, "netlify/system-prompt.md"), "utf-8");

const errors = [];
let prompt = "";
try {
  prompt = buildSystemPrompt(template, config);
} catch (e) {
  errors.push(e.message);
}

if (prompt) {
  if (/\{\{|\}\}/.test(prompt)) errors.push("jeton {{...}} non remplace dans le prompt final");
  if (/<!--/.test(prompt)) errors.push("commentaire HTML ou bloc IF reste dans le prompt final");

  const must = [
    [`${config.PRIX_FIXE}€`, "PRIX_FIXE"],
    [`${config.PRIX_MAINTENANCE}€`, "PRIX_MAINTENANCE"],
    [`${config.PRIX_ESSENTIEL}€`, "PRIX_ESSENTIEL"],
    [`${config.PRIX_PREMIUM_AFFICHE}€`, "PRIX_PREMIUM_AFFICHE"],
    [`${config.PRIX_SUR_MESURE_DES_AFFICHE}€`, "PRIX_SUR_MESURE_DES_AFFICHE"],
    [`€${config.PRIX_PREMIUM_AFFICHE_EN}`, "PRIX_PREMIUM_AFFICHE_EN"],
    [`€${config.PRIX_SUR_MESURE_DES_AFFICHE_EN}`, "PRIX_SUR_MESURE_DES_AFFICHE_EN"],
    [`+${config.PRIX_AUTOMATISATION_LEADS}€`, "PRIX_AUTOMATISATION_LEADS"],
    [`+${config.PRIX_AUTOMATISATION_COMPLET}€`, "PRIX_AUTOMATISATION_COMPLET"],
    [`${config.PRIX_AUDIT}€`, "PRIX_AUDIT"],
    [`${config.PRIX_AGENCE_MIN}`, "PRIX_AGENCE_MIN"],
    [`${config.PRIX_AGENCE_MAX}€`, "PRIX_AGENCE_MAX"],
    [`${config.PRIX_FORMATION_SEO}€`, "PRIX_FORMATION_SEO"],
    [`${config.CAPACITE_PROJETS_MOIS} projets par mois`, "CAPACITE_PROJETS_MOIS"],
    [String(config.DELAI_ESSENTIEL), "DELAI_ESSENTIEL"],
    [String(config.DELAI_PREMIUM), "DELAI_PREMIUM"],
    [String(config.DELAI_PLAGE), "DELAI_PLAGE"],
    [String(config.DELAI_AUTOMATISATION), "DELAI_AUTOMATISATION"],
    [String(config.DELAI_AUDIT), "DELAI_AUDIT"],
    [String(config.DELAI_SITE_ARTISAN), "DELAI_SITE_ARTISAN"],
    [String(config.DELAI_DEBUT), "DELAI_DEBUT"],
    [`${config.PAIEMENT_PACK_ACOMPTE_POURCENT} % à la commande`, "PAIEMENT_PACK_ACOMPTE_POURCENT"],
    [`${config.PAIEMENT_PACK_SOLDE_POURCENT} % à la livraison`, "PAIEMENT_PACK_SOLDE_POURCENT"],
    [`${config.PAIEMENT_SURMESURE_1_POURCENT} % à la commande`, "PAIEMENT_SURMESURE_1_POURCENT"],
    [`${config.PAIEMENT_SURMESURE_2_POURCENT} % au lancement`, "PAIEMENT_SURMESURE_2_POURCENT"],
    [`${config.PAIEMENT_SURMESURE_3_POURCENT} % à la livraison`, "PAIEMENT_SURMESURE_3_POURCENT"],
    [String(config.TEXTES_BASE), "TEXTES_BASE"],
    [String(config.TEXTES_COMPLETS), "TEXTES_COMPLETS"],
    [`${config.ACOMPTE_POURCENT} %`, "ACOMPTE_POURCENT"],
    [`${config.ACOMPTE_MONTANT}€`, "ACOMPTE_MONTANT"],
    [`${config.SOLDE_POURCENT} %`, "SOLDE_POURCENT"],
    [`${config.SOLDE_MONTANT}€`, "SOLDE_MONTANT"],
  ];
  if (String(config.PRIX_MENTION_EN || "").trim()) must.push([String(config.PRIX_MENTION_EN), "PRIX_MENTION_EN"]);
  if (String(config.PRIX_MENTION || "").trim()) must.push([String(config.PRIX_MENTION), "PRIX_MENTION"]);
  for (const [value, key] of must) {
    if (!prompt.includes(value)) errors.push(`le prompt ne contient pas la valeur de ${key} ("${value}")`);
  }

  const stale = [
    [/(?:dès|des|à partir de|a partir de)\s*700\s*€/i, "ancien prix 'dès 700€'"],
    [/9h\s*[-–]\s*18h|lun(?:di)?\s*[-–]\s*ven(?:dredi)?/i, "anciens horaires lun-ven 9h-18h"],
    [/18\s*h\s*30|21\s*h\b|créneau de rappel|rappelle chaque/i, "creneau de rappel (18h30-21h)"],
    [/samedi|week-end|rencontre possible|se déplace/i, "rencontre physique ou creneau soir/week-end"],
    [/consultation gratuite|consultation ponctuelle|accompagnement mensuel/i, "consultation ou accompagnement (retires de la grille)"],
    [/30\s*minutes/i, "'30 minutes'"],
    [/woocommerce|shopify|zapier|\bmake\.com\b|prestashop/i, "outil no-code ou CMS retire de l'offre"],
    [/un (?:seul )?projet à la fois|one project at a time/i, "'un projet a la fois' (remplace par la capacite mensuelle)"],
  ];
  for (const [re, label] of stale) {
    if (re.test(prompt)) errors.push(`valeur perimee dans le prompt : ${label}`);
  }

  // Montants et creneau jamais ecrits en dur dans le gabarit (doivent passer par les jetons).
  const hard = [
    [String(config.PRIX_FIXE), "{{PRIX_FIXE}}"],
    [String(config.PRIX_MAINTENANCE), "{{PRIX_MAINTENANCE}}"],
    [String(config.PRIX_ESSENTIEL), "{{PRIX_ESSENTIEL}}"],
    [String(config.PRIX_PREMIUM), "{{PRIX_PREMIUM_AFFICHE}}"],
    [String(config.PRIX_SUR_MESURE_DES), "{{PRIX_SUR_MESURE_DES_AFFICHE}}"],
    [String(config.PRIX_AUTOMATISATION_LEADS), "{{PRIX_AUTOMATISATION_LEADS}}"],
    [String(config.PRIX_AUTOMATISATION_COMPLET), "{{PRIX_AUTOMATISATION_COMPLET}}"],
    [String(config.PRIX_AUDIT), "{{PRIX_AUDIT}}"],
    [String(config.PRIX_AGENCE_MIN), "{{PRIX_AGENCE_MIN}}"],
    [String(config.PRIX_AGENCE_MAX), "{{PRIX_AGENCE_MAX}}"],
    [String(config.PRIX_FORMATION_SEO), "{{PRIX_FORMATION_SEO}}"],
    [String(config.ACOMPTE_MONTANT), "{{ACOMPTE_MONTANT}}"],
    [String(config.SOLDE_MONTANT), "{{SOLDE_MONTANT}}"],
  ];
  const body = template.replace(/^\s*<!--[\s\S]*?-->\s*/, "");
  for (const [n, token] of hard) {
    if (new RegExp(`(?<![0-9{])${n}\\s*€`).test(body)) errors.push(`montant ${n}€ ecrit en dur dans le gabarit, utiliser ${token}`);
  }
  // Formes d'affichage (1 290, 1,290) : jamais en dur non plus.
  for (const key of ["PRIX_PREMIUM_AFFICHE", "PRIX_SUR_MESURE_DES_AFFICHE", "PRIX_PREMIUM_AFFICHE_EN", "PRIX_SUR_MESURE_DES_AFFICHE_EN"]) {
    if (body.includes(String(config[key]))) errors.push(`valeur de ${key} ecrite en dur dans le gabarit, utiliser {{${key}}}`);
  }

  // Durees : jamais ecrites en dur dans le gabarit (jetons DELAI_*), ni valeurs de la config recopiees.
  const withoutTokens = body.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  const durationRe = /(?:\b\d+\s*(?:à|a|-)\s*\d+\s*(?:semaines?|mois|jours?)\b|\b(?:un|une|\d+)\s+(?:semaines?|mois)\b(?!\s+(?:par|en|d'|de))|\b\d+\s+(?:jours?|heures?|h)\b|quelques\s+jours)/gi;
  for (const m of withoutTokens.matchAll(durationRe)) {
    errors.push(`duree ecrite en dur dans le gabarit ("${m[0]}"), utiliser un jeton DELAI_* de site.config.json`);
  }
  for (const key of ["DELAI_ESSENTIEL", "DELAI_PREMIUM", "DELAI_PLAGE", "DELAI_AUTOMATISATION", "DELAI_AUDIT", "DELAI_SITE_ARTISAN", "DELAI_DEBUT"]) {
    if (body.includes(String(config[key]))) errors.push(`valeur de ${key} ecrite en dur dans le gabarit, utiliser {{${key}}}`);
  }
  // Capacite mensuelle : jamais un nombre en dur.
  if (new RegExp(`(?<![0-9])${config.CAPACITE_PROJETS_MOIS}\\s+projets?\\s+par\\s+mois`, "i").test(withoutTokens) || /\b\d+\s+projets?\s+par\s+mois/i.test(withoutTokens)) {
    errors.push("capacite mensuelle ecrite en dur dans le gabarit, utiliser {{CAPACITE_PROJETS_MOIS}}");
  }

  for (const key of ["ACOMPTE_POURCENT", "SOLDE_POURCENT"]) {
    if (new RegExp(`(?<![0-9])${config[key]}\\s*%`).test(body)) errors.push(`pourcentage ${key} ecrit en dur dans le gabarit, utiliser {{${key}}}`);
  }

  // Coherence interne de la config : formes affichees, durees et valeurs numeriques alignees.
  const digits = (v) => String(v).replace(/[^0-9]/g, "");
  for (const [shown, num, key] of [
    [config.PRIX_PREMIUM_AFFICHE, config.PRIX_PREMIUM, "PRIX_PREMIUM_AFFICHE"],
    [config.PRIX_PREMIUM_AFFICHE_EN, config.PRIX_PREMIUM, "PRIX_PREMIUM_AFFICHE_EN"],
    [config.PRIX_SUR_MESURE_DES_AFFICHE, config.PRIX_SUR_MESURE_DES, "PRIX_SUR_MESURE_DES_AFFICHE"],
    [config.PRIX_SUR_MESURE_DES_AFFICHE_EN, config.PRIX_SUR_MESURE_DES, "PRIX_SUR_MESURE_DES_AFFICHE_EN"],
  ]) {
    if (digits(shown) !== digits(num)) errors.push(`${key} ("${shown}") ne correspond pas a la valeur numerique ${num}`);
  }
  const lead = (v) => parseInt(String(v), 10);
  if (lead(config.DELAI_ESSENTIEL) !== config.DELAI_ESSENTIEL_JOURS) errors.push("DELAI_ESSENTIEL et DELAI_ESSENTIEL_JOURS divergent");
  if (lead(config.DELAI_PREMIUM) !== config.DELAI_PREMIUM_JOURS) errors.push("DELAI_PREMIUM et DELAI_PREMIUM_JOURS divergent");
  if (lead(config.DELAI_AUTOMATISATION) !== config.DELAI_AUTOMATISATION_JOURS) errors.push("DELAI_AUTOMATISATION et DELAI_AUTOMATISATION_JOURS divergent");
  if (lead(config.DELAI_AUDIT) !== config.DELAI_AUDIT_HEURES) errors.push("DELAI_AUDIT et DELAI_AUDIT_HEURES divergent");
  if (String(config.DELAI_PLAGE) !== `${config.DELAI_ESSENTIEL_JOURS} à ${config.DELAI_PREMIUM_JOURS} jours`) errors.push(`DELAI_PLAGE ("${config.DELAI_PLAGE}") ne couvre pas DELAI_ESSENTIEL_JOURS a DELAI_PREMIUM_JOURS`);
  if (String(config.DELAI_PLAGE_EN) !== `${config.DELAI_ESSENTIEL_JOURS} to ${config.DELAI_PREMIUM_JOURS} days`) errors.push("DELAI_PLAGE_EN ne couvre pas DELAI_ESSENTIEL_JOURS a DELAI_PREMIUM_JOURS");

  if (config.PAIEMENT_PACK_ACOMPTE_POURCENT + config.PAIEMENT_PACK_SOLDE_POURCENT !== 100) errors.push("PAIEMENT_PACK_ACOMPTE_POURCENT + PAIEMENT_PACK_SOLDE_POURCENT doit valoir 100");
  if (config.PAIEMENT_SURMESURE_1_POURCENT + config.PAIEMENT_SURMESURE_2_POURCENT + config.PAIEMENT_SURMESURE_3_POURCENT !== 100) errors.push("les trois versements Sur-mesure doivent totaliser 100 %");

  // Coherence avec les pages publiees : chaque page d'offre doit utiliser les jetons de la config.
  const page = (f) => readFileSync(join(ROOT, f), "utf-8");
  const tokenPages = [
    ["tarifs.html", ["PRIX_ESSENTIEL", "PRIX_PREMIUM_AFFICHE", "PRIX_SUR_MESURE_DES_AFFICHE", "PRIX_AUTOMATISATION_LEADS", "PRIX_AUTOMATISATION_COMPLET", "PRIX_AUDIT", "PRIX_AGENCE_MIN", "PRIX_AGENCE_MAX", "DELAI_ESSENTIEL", "DELAI_PREMIUM", "DELAI_AUTOMATISATION", "DELAI_AUDIT", "CAPACITE_PROJETS_MOIS"]],
    ["en/tarifs.html", ["PRIX_ESSENTIEL", "PRIX_PREMIUM_AFFICHE_EN", "PRIX_SUR_MESURE_DES_AFFICHE_EN", "PRIX_AUTOMATISATION_LEADS", "PRIX_AUTOMATISATION_COMPLET", "PRIX_AUDIT", "PRIX_AGENCE_MIN", "PRIX_AGENCE_MAX", "DELAI_ESSENTIEL_EN", "DELAI_PREMIUM_EN", "DELAI_AUTOMATISATION_EN", "DELAI_AUDIT_EN", "CAPACITE_PROJETS_MOIS"]],
    ["index.html", ["PRIX_ESSENTIEL", "PRIX_PREMIUM_AFFICHE", "PRIX_AUTOMATISATION_LEADS", "DELAI_PREMIUM", "DELAI_PLAGE", "CAPACITE_PROJETS_MOIS"]],
    ["en/index.html", ["PRIX_ESSENTIEL", "PRIX_PREMIUM_AFFICHE_EN", "PRIX_AUTOMATISATION_LEADS", "DELAI_PREMIUM_EN", "DELAI_PLAGE_EN", "CAPACITE_PROJETS_MOIS"]],
    ["services/automatisation-n8n-castres.html", ["PRIX_AUTOMATISATION_LEADS", "PRIX_AUTOMATISATION_COMPLET", "DELAI_AUTOMATISATION"]],
    ["en/services/automatisation-n8n-castres.html", ["PRIX_AUTOMATISATION_LEADS", "PRIX_AUTOMATISATION_COMPLET", "DELAI_AUTOMATISATION_EN"]],
    ["offre-site-artisan-btp.html", ["DELAI_SITE_ARTISAN"]],
    ["en/offre-site-artisan-btp.html", ["DELAI_SITE_ARTISAN_EN"]],
    ["cgv.html", ["PAIEMENT_PACK_ACOMPTE_POURCENT", "PAIEMENT_PACK_SOLDE_POURCENT", "PAIEMENT_SURMESURE_1_POURCENT", "PAIEMENT_SURMESURE_2_POURCENT", "PAIEMENT_SURMESURE_3_POURCENT"]],
    ["tarifs.html", ["PAIEMENT_PACK_ACOMPTE_POURCENT"]],
    ["agences.html", ["PRIX_AGENCE_MIN", "PRIX_AGENCE_MAX"]],
    ["en/agencies.html", ["PRIX_AGENCE_MIN", "PRIX_AGENCE_MAX"]],
    ["contact.html", ["DELAI_PLAGE"]],
    ["en/contact.html", ["DELAI_PLAGE_EN"]],
  ];
  for (const [file, keys] of tokenPages) {
    const html = page(file);
    for (const key of keys) {
      if (!html.includes(`{{${key}}}`)) errors.push(`${file} n'utilise plus le jeton {{${key}}} : la valeur doit venir de site.config.json`);
    }
  }
  // SaaS : sur-mesure, delai defini au devis (plus aucun delai MVP chiffre).
  for (const file of ["services/applications-saas.html", "en/services/applications-saas.html"]) {
    if (/MVP en|MVP in|DELAI_SAAS/.test(page(file))) errors.push(`${file} annonce encore un delai MVP : le SaaS est sur-mesure, delai defini au devis`);
  }

  // Textes : offre, CGV et prompt partagent les memes jetons (une seule source).
  for (const [file, tokens] of [
    ["offre-site-artisan-btp.html", ["{{TEXTES_BASE}}", "{{TEXTES_COMPLETS}}"]],
    ["en/offre-site-artisan-btp.html", ["{{TEXTES_BASE_EN}}", "{{TEXTES_COMPLETS_EN}}"]],
    ["cgv.html", ["{{TEXTES_BASE}}", "{{TEXTES_COMPLETS}}"]],
  ]) {
    for (const t of tokens) if (!page(file).includes(t)) errors.push(`${file} n'utilise plus le jeton ${t} : la regle sur les textes doit venir de site.config.json`);
  }
  // Formation SEO local : montant affiche sur la page Tarifs.
  if (!new RegExp(`(?<![0-9])${config.PRIX_FORMATION_SEO}<span class="pc-currency">`).test(page("tarifs.html"))) {
    errors.push(`tarifs.html n'affiche plus ${config.PRIX_FORMATION_SEO} € (PRIX_FORMATION_SEO) : le prompt et la page divergent`);
  }

  // Aucun tiret long dans ce que voit le modele (il aurait tendance a les reproduire).
  if (/[—–]|--/.test(body.replace(/<!--(?:IF|ENDIF):[A-Z0-9_]+-->/g, ""))) errors.push("tiret cadratin, demi-cadratin ou double tiret dans le gabarit du prompt");

  // Marqueurs CTA : le frontend lit [[CTA:Libelle]] et [[CTA:brief:Libelle]].
  const core = readFileSync(join(ROOT, "js/spark-chat-core.js"), "utf-8");
  if (!/CTA_RE\s*=\s*\/\\\[\\\[CTA:\(\?:\(brief\|contact\|tarifs\):\)\?/.test(core)) {
    errors.push("js/spark-chat-core.js ne gere plus le prefixe brief:/contact:/tarifs: du marqueur CTA");
  }
  if (!prompt.includes("[[CTA:brief:")) errors.push("le prompt ne documente pas le marqueur [[CTA:brief:Libelle]]");
  if (!prompt.includes("[[CTA:tarifs:")) errors.push("le prompt ne documente pas le marqueur [[CTA:tarifs:Libelle]]");
}

if (errors.length) {
  console.error("\nCheck prompt SPARK : " + errors.length + " probleme(s)\n  - " + errors.join("\n  - "));
  process.exit(1);
}
console.log(`Check prompt SPARK OK : valeurs alignees sur site.config.json (${prompt.length} caracteres).`);
