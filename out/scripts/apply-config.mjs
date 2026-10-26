#!/usr/bin/env node
/**
 * Applique site.config.json aux pages HTML d'un dossier de publication
 * (par defaut ./out, appele par build.sh juste apres la copie rsync).
 *
 * - {{CLE}}                        : remplace par la valeur de la config.
 * - <!--IF:CLE--> a <!--ENDIF:CLE--> : bloc conserve seulement si la valeur est
 *   "vraie" (non vide, non false, non 0). <!--ELSE:CLE--> optionnel.
 *
 * Le build echoue si une page reference une cle inconnue, si un bloc IF est
 * mal ferme, ou si l'offre de lancement est activee sans texte : mieux vaut
 * un build rouge qu'un jeton {{...}} visible en production.
 *
 * Usage : node scripts/apply-config.mjs [dossier]
 *         (SITE_CONFIG=chemin.json pour tester une autre config sans toucher a la vraie)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(process.argv[2] || join(ROOT, "out"));
const config = JSON.parse(readFileSync(process.env.SITE_CONFIG || join(ROOT, "site.config.json"), "utf-8"));

const SKIP_DIRS = new Set(["blog", "_next", "node_modules", ".git"]);

function isTruthy(v) {
  return !(v === undefined || v === null || v === false || v === 0 || String(v).trim() === "");
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, out);
    } else if (entry.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const errors = [];

if (isTruthy(config.OFFRE_LANCEMENT_ACTIVE)) {
  if (!isTruthy(config.OFFRE_LANCEMENT_TEXTE) || !isTruthy(config.OFFRE_LANCEMENT_TEXTE_EN)) {
    errors.push(
      "OFFRE_LANCEMENT_ACTIVE est a true mais OFFRE_LANCEMENT_TEXTE / OFFRE_LANCEMENT_TEXTE_EN sont vides."
    );
  }
}

let changed = 0;
for (const file of walk(target)) {
  const rel = file.slice(target.length + 1);
  let html = readFileSync(file, "utf-8");
  if (!html.includes("{{") && !html.includes("<!--IF:")) continue;
  const before = html;

  // Blocs conditionnels (non imbriques)
  html = html.replace(
    /<!--IF:([A-Z0-9_]+)-->([\s\S]*?)(?:<!--ELSE:\1-->([\s\S]*?))?<!--ENDIF:\1-->/g,
    (_m, key, yes, no) => {
      if (!(key in config)) {
        errors.push(`${rel}: bloc IF sur une cle inconnue "${key}"`);
        return "";
      }
      return isTruthy(config[key]) ? yes : no || "";
    }
  );
  if (/<!--(IF|ELSE|ENDIF):/.test(html)) {
    errors.push(`${rel}: bloc IF/ELSE/ENDIF mal ferme ou imbrique`);
  }

  // Jetons
  html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key) => {
    if (!(key in config)) {
      errors.push(`${rel}: jeton inconnu {{${key}}}`);
      return "";
    }
    return String(config[key]);
  });

  if (html !== before) {
    writeFileSync(file, html);
    changed++;
  }
}

if (errors.length) {
  console.error("[config] ERREUR :\n  - " + errors.join("\n  - "));
  process.exit(1);
}
console.log(`[config] site.config.json applique a ${changed} page(s).`);
