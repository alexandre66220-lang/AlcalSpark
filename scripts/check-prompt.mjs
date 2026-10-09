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
  ];
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
  ];
  const body = template.replace(/^\s*<!--[\s\S]*?-->\s*/, "");
  for (const [n, token] of hard) {
    if (new RegExp(`(?<![0-9{])${n}\\s*€`).test(body)) errors.push(`montant ${n}€ ecrit en dur dans le gabarit, utiliser ${token}`);
  }
  if (body.includes(String(config.HORAIRES_RAPPEL))) errors.push("creneau de rappel ecrit en dur dans le gabarit, utiliser {{HORAIRES_RAPPEL}}");

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
