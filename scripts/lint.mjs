#!/usr/bin/env node
/**
 * Verifications statiques du site (aucune dependance externe).
 *
 *  1. site.config.json : cles utilisees dans le HTML, blocs IF equilibres,
 *     lien de paiement en https, offre de lancement coherente.
 *  2. Donnees structurees (JSON-LD) valides, apres application de la config.
 *  3. Liens et ressources locales (href/src) qui pointent vers un fichier existant.
 *  4. Pages de l'offre artisan : pas de tiret cadratin ni demi-cadratin,
 *     pages de brief en noindex.
 *  5. Syntaxe de tous les fichiers js/*.js (node --check).
 *  6. Sitemap : pages de l'offre presentes.
 *
 * Usage : node scripts/lint.mjs   (code de sortie 1 si une verification echoue)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf-8"));
const SKIP = new Set(["node_modules", ".git", "out", "blog-app", "design_handoff_alcalspark_da", "netlify", ".claude"]);

function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, ext, out);
    else if (e.endsWith(ext)) out.push(full);
  }
  return out;
}

const htmlFiles = walk(ROOT, ".html");
const rel = (f) => relative(ROOT, f);
const errors = [];
const fail = (check, msg) => errors.push(`[${check}] ${msg}`);
const truthy = (v) => !(v === undefined || v === null || v === false || v === 0 || String(v).trim() === "");

/* 1. Config ---------------------------------------------------------- */
if (truthy(config.OFFRE_LANCEMENT_ACTIVE) && (!truthy(config.OFFRE_LANCEMENT_TEXTE) || !truthy(config.OFFRE_LANCEMENT_TEXTE_EN))) {
  fail("config", "OFFRE_LANCEMENT_ACTIVE est a true mais les textes d'offre de lancement sont vides.");
}
if (truthy(config.LIEN_PAIEMENT_ACOMPTE) && !/^https:\/\/\S+$/.test(String(config.LIEN_PAIEMENT_ACOMPTE))) {
  fail("config", "LIEN_PAIEMENT_ACOMPTE doit etre une URL https:// complete (ou vide).");
}
if (!(Number(config.PRIX_FIXE) > 0)) fail("config", "PRIX_FIXE doit etre un nombre positif.");
if (!(Number(config.PRIX_MAINTENANCE) > 0)) fail("config", "PRIX_MAINTENANCE doit etre un nombre positif.");

const usedKeys = new Set();
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf-8");
  for (const m of html.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) {
    usedKeys.add(m[1]);
    if (!(m[1] in config)) fail("config", `${rel(f)}: jeton inconnu {{${m[1]}}}`);
  }
  for (const m of html.matchAll(/<!--(IF|ELSE|ENDIF):([A-Z0-9_]+)-->/g)) {
    if (!(m[2] in config)) fail("config", `${rel(f)}: bloc ${m[1]} sur une cle inconnue ${m[2]}`);
  }
  const ifs = (html.match(/<!--IF:/g) || []).length;
  const endifs = (html.match(/<!--ENDIF:/g) || []).length;
  if (ifs !== endifs) fail("config", `${rel(f)}: ${ifs} <!--IF:--> pour ${endifs} <!--ENDIF:-->`);
}
for (const k of Object.keys(config)) {
  if (!usedKeys.has(k) && !htmlFiles.some((f) => readFileSync(f, "utf-8").includes(`IF:${k}-->`))) {
    console.warn(`[config] avertissement : la cle ${k} n'est utilisee par aucune page.`);
  }
}

/* 2. JSON-LD --------------------------------------------------------- */
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf-8");
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const body = m[1].replace(/<!--(?:IF|ELSE|ENDIF):[A-Z0-9_]+-->/g, "").replace(/\{\{[A-Z0-9_]+\}\}/g, "0");
    try {
      JSON.parse(body);
    } catch (e) {
      fail("json-ld", `${rel(f)}: JSON-LD invalide (${e.message})`);
    }
  }
}

/* 3. Liens et ressources locales ------------------------------------ */
const LINK_RE = /\s(?:href|src)="([^"]+)"/g;
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf-8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (s) => (/\ssrc=/.test(s.split(">")[0]) ? s.split(">")[0] + "></script>" : ""))
    .replace(/<!--[\s\S]*?-->/g, "");
  for (const m of html.matchAll(LINK_RE)) {
    let url = m[1].trim();
    if (!url || /^(https?:|mailto:|tel:|javascript:|data:|#|\/\/)/.test(url) || url.includes("{{")) continue;
    url = url.split("#")[0].split("?")[0];
    if (!url) continue;
    if (url === "blog/" || url.endsWith("/blog/") || url.startsWith("/blog") || url.includes("_next/")) continue; // blog build a part
    const target = url.startsWith("/") ? join(ROOT, url) : resolve(dirname(f), url);
    if (existsSync(target)) continue;
    if (existsSync(target + ".html")) continue; // pretty URLs Netlify
    fail("liens", `${rel(f)}: ressource introuvable "${m[1]}"`);
  }
}

/* 4. Pages de l'offre artisan --------------------------------------- */
const OFFRE_PAGES = [
  "offre-site-artisan-btp.html",
  "brief-site-artisan-btp.html",
  "brief-site-artisan-btp-merci.html",
  "en/offre-site-artisan-btp.html",
  "en/brief-site-artisan-btp.html",
  "en/brief-site-artisan-btp-merci.html",
  "js/testimonials.js",
];
for (const p of OFFRE_PAGES) {
  const file = join(ROOT, p);
  if (!existsSync(file)) {
    fail("offre", `${p} est absent`);
    continue;
  }
  const txt = readFileSync(file, "utf-8");
  const visible = p.endsWith(".html")
    ? txt.replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<style\b[\s\S]*?<\/style>/g, "")
    : txt;
  const dash = visible.match(/[—–]/);
  if (dash) fail("offre", `${p}: tiret cadratin ou demi-cadratin interdit (${JSON.stringify(visible.slice(Math.max(0, dash.index - 30), dash.index + 30))})`);
  if (/brief/.test(p) && p.endsWith(".html") && !/<meta name="robots" content="noindex/.test(txt)) {
    fail("offre", `${p}: doit etre en noindex`);
  }
}

/* 5. Syntaxe JS ------------------------------------------------------ */
for (const f of walk(join(ROOT, "js"), ".js")) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf-8" });
  if (r.status !== 0) fail("js", `${rel(f)}: ${r.stderr.split("\n")[0]}`);
}

/* 6. Sitemap --------------------------------------------------------- */
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf-8");
for (const u of ["https://alcalspark.com/offre-site-artisan-btp", "https://alcalspark.com/en/offre-site-artisan-btp"]) {
  if (!sitemap.includes(`<loc>${u}</loc>`)) fail("sitemap", `${u} absent de sitemap.xml`);
}
for (const u of ["brief-site-artisan-btp", "brief-site-artisan-btp-merci"]) {
  if (sitemap.includes(u)) fail("sitemap", `${u} ne doit pas etre dans le sitemap (noindex)`);
}

/* Bilan -------------------------------------------------------------- */
if (errors.length) {
  console.error(`\nLint : ${errors.length} probleme(s)\n  - ` + errors.join("\n  - "));
  process.exit(1);
}
console.log(`Lint OK : ${htmlFiles.length} pages HTML, ${walk(join(ROOT, "js"), ".js").length} scripts JS verifies.`);
