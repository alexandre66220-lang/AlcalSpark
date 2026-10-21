#!/usr/bin/env node
/**
 * Verifie que le prompt systeme de SPARK reste coherent avec site.config.json.
 * Lance par build.sh (et `npm run lint`). Code de sortie 1 si un controle echoue.
 *
 *  1. Le prompt se construit (aucun jeton inconnu ou vide).
 *  2. Il contient les valeurs reelles de la config (prix fixe, maintenance,
 *     creneau de rappel, mention fiscale si renseignee) et aucun {{jeton}} restant.
 *  3. Il ne reintroduit pas de valeurs perimees ecrites en dur : ancien prix
 *     "des 700", horaires "9h-18h" / "Lun-Ven", "consultation gratuite", "30 minutes",
 *     ni le prix fixe ou la maintenance en dur (les montants doivent venir des jetons).
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
    [String(config.HORAIRES_RAPPEL), "HORAIRES_RAPPEL"],
    [String(config.HORAIRES_RAPPEL_EN), "HORAIRES_RAPPEL_EN"],
    [String(config.DELAI_SITE_ARTISAN), "DELAI_SITE_ARTISAN"],
    [String(config.DELAI_DEBUT), "DELAI_DEBUT"],
    [String(config.DELAI_SITE_HORS_BTP), "DELAI_SITE_HORS_BTP"],
    [String(config.DELAI_AUTOMATISATION_SIMPLE), "DELAI_AUTOMATISATION_SIMPLE"],
    [String(config.DELAI_AUTOMATISATION_COMPLETE), "DELAI_AUTOMATISATION_COMPLETE"],
    [String(config.DELAI_SAAS_MVP), "DELAI_SAAS_MVP"],
    [String(config.TEXTES_BASE), "TEXTES_BASE"],
    [String(config.TEXTES_COMPLETS), "TEXTES_COMPLETS"],
    [`${config.PRIX_CONSULTATION}€`, "PRIX_CONSULTATION"],
    [`${config.PRIX_ACCOMPAGNEMENT}€`, "PRIX_ACCOMPAGNEMENT"],
    [`${config.PRIX_FORMATION_SEO}€`, "PRIX_FORMATION_SEO"],
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
    [/consultation gratuite/i, "'consultation gratuite'"],
    [/30\s*minutes/i, "'30 minutes'"],
  ];
  for (const [re, label] of stale) {
    if (re.test(prompt)) errors.push(`valeur perimee dans le prompt : ${label}`);
  }

  // Montants et creneau jamais ecrits en dur dans le gabarit (doivent passer par les jetons).
  const hard = [
    [String(config.PRIX_FIXE), "{{PRIX_FIXE}}"],
    [String(config.PRIX_MAINTENANCE), "{{PRIX_MAINTENANCE}}"],
    [String(config.PRIX_CONSULTATION), "{{PRIX_CONSULTATION}}"],
    [String(config.PRIX_ACCOMPAGNEMENT), "{{PRIX_ACCOMPAGNEMENT}}"],
    [String(config.PRIX_FORMATION_SEO), "{{PRIX_FORMATION_SEO}}"],
    [String(config.ACOMPTE_MONTANT), "{{ACOMPTE_MONTANT}}"],
    [String(config.SOLDE_MONTANT), "{{SOLDE_MONTANT}}"],
  ];
  const body = template.replace(/^\s*<!--[\s\S]*?-->\s*/, "");
  for (const [n, token] of hard) {
    if (new RegExp(`(?<![0-9{])${n}\\s*€`).test(body)) errors.push(`montant ${n}€ ecrit en dur dans le gabarit, utiliser ${token}`);
  }
  if (body.includes(String(config.HORAIRES_RAPPEL))) errors.push("creneau de rappel ecrit en dur dans le gabarit, utiliser {{HORAIRES_RAPPEL}}");

  // Durees : jamais ecrites en dur dans le gabarit (jetons DELAI_*), ni valeurs de la config recopiees.
  const withoutTokens = body.replace(/\{\{[A-Z0-9_]+\}\}/g, "");
  const durationRe = /(?:\b\d+\s*(?:à|a|-)\s*\d+\s*(?:semaines?|mois|jours?)\b|\b(?:un|une|\d+)\s+(?:semaines?|mois)\b(?!\s+(?:par|en|d'|de))|quelques\s+jours)/gi;
  for (const m of withoutTokens.matchAll(durationRe)) {
    errors.push(`duree ecrite en dur dans le gabarit ("${m[0]}"), utiliser un jeton DELAI_* de site.config.json`);
  }
  for (const key of ["DELAI_SITE_ARTISAN", "DELAI_DEBUT", "DELAI_SITE_HORS_BTP", "DELAI_AUTOMATISATION_SIMPLE", "DELAI_AUTOMATISATION_COMPLETE", "DELAI_SAAS_MVP"]) {
    if (body.includes(String(config[key]))) errors.push(`valeur de ${key} ecrite en dur dans le gabarit, utiliser {{${key}}}`);
  }

  for (const key of ["ACOMPTE_POURCENT", "SOLDE_POURCENT"]) {
    if (new RegExp(`(?<![0-9])${config[key]}\\s*%`).test(body)) errors.push(`pourcentage ${key} ecrit en dur dans le gabarit, utiliser {{${key}}}`);
  }

  // Coherence avec les pages publiees : les valeurs de la config doivent y figurer.
  const page = (f) => readFileSync(join(ROOT, f), "utf-8");
  const pageChecks = [
    ["offre-site-artisan-btp.html", config.DELAI_SITE_ARTISAN, "DELAI_SITE_ARTISAN"],
    ["tarifs.html", config.DELAI_SITE_ARTISAN, "DELAI_SITE_ARTISAN"],
    ["services/automatisation-n8n-castres.html", config.DELAI_AUTOMATISATION_SIMPLE, "DELAI_AUTOMATISATION_SIMPLE"],
    ["services/automatisation-n8n-castres.html", config.DELAI_AUTOMATISATION_COMPLETE, "DELAI_AUTOMATISATION_COMPLETE"],
    ["services/creation-site-web-castres.html", "2 à 3 semaines", "DELAI_SITE_HORS_BTP (2 à 3 semaines)"],
  ];
  for (const [file, value, key] of pageChecks) {
    if (!page(file).includes(String(value))) errors.push(`${file} ne publie plus "${value}" (${key}) : le prompt et la page divergent`);
  }
  // Delai SaaS : la page SaaS doit utiliser le meme jeton que le prompt (une seule source).
  for (const [file, token] of [["services/applications-saas.html", "{{DELAI_SAAS_MVP}}"], ["en/services/applications-saas.html", "{{DELAI_SAAS_MVP_EN}}"]]) {
    if (!page(file).includes(token)) errors.push(`${file} n'utilise plus le jeton ${token} : le delai SaaS doit venir de site.config.json`);
  }

  // Textes : offre, CGV et prompt partagent les memes jetons (une seule source).
  for (const [file, tokens] of [
    ["offre-site-artisan-btp.html", ["{{TEXTES_BASE}}", "{{TEXTES_COMPLETS}}"]],
    ["en/offre-site-artisan-btp.html", ["{{TEXTES_BASE_EN}}", "{{TEXTES_COMPLETS_EN}}"]],
    ["cgv.html", ["{{TEXTES_BASE}}", "{{TEXTES_COMPLETS}}"]],
  ]) {
    for (const t of tokens) if (!page(file).includes(t)) errors.push(`${file} n'utilise plus le jeton ${t} : la regle sur les textes doit venir de site.config.json`);
  }
  const tarifs = page("tarifs.html");
  for (const [n, key] of [[config.PRIX_CONSULTATION, "PRIX_CONSULTATION"], [config.PRIX_ACCOMPAGNEMENT, "PRIX_ACCOMPAGNEMENT"], [config.PRIX_FORMATION_SEO, "PRIX_FORMATION_SEO"]]) {
    if (!new RegExp(`(?<![0-9])${n}<span class="pc-currency">`).test(tarifs)) errors.push(`tarifs.html n'affiche plus ${n} € (${key}) : le prompt et la page divergent`);
  }

  // Aucun tiret long dans ce que voit le modele (il aurait tendance a les reproduire).
  if (/[—–]|--/.test(body.replace(/<!--(?:IF|ENDIF):[A-Z0-9_]+-->/g, ""))) errors.push("tiret cadratin, demi-cadratin ou double tiret dans le gabarit du prompt");

  // Marqueurs CTA : le frontend lit [[CTA:Libelle]] et [[CTA:brief:Libelle]].
  const core = readFileSync(join(ROOT, "js/spark-chat-core.js"), "utf-8");
  if (!/CTA_RE\s*=\s*\/\\\[\\\[CTA:\(\?:\(brief\|contact\):\)\?/.test(core)) {
    errors.push("js/spark-chat-core.js ne gere plus le prefixe brief:/contact: du marqueur CTA");
  }
  if (!prompt.includes("[[CTA:brief:")) errors.push("le prompt ne documente pas le marqueur [[CTA:brief:Libelle]]");
}

if (errors.length) {
  console.error("\nCheck prompt SPARK : " + errors.length + " probleme(s)\n  - " + errors.join("\n  - "));
  process.exit(1);
}
console.log(`Check prompt SPARK OK : valeurs alignees sur site.config.json (${prompt.length} caracteres).`);
