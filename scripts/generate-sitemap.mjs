#!/usr/bin/env node
/**
 * Verifie que sitemap.xml (racine) reflete bien les pages .html reelles du
 * site statique (racine, services/, portfolio/). N'ajoute jamais une page
 * marquee noindex, et conserve le lastmod/priority/changefreq existant pour
 * les URLs deja presentes plutot que de les ecraser a chaque execution.
 *
 * Le blog (blog-app/, Next.js + Sanity) a son propre sitemap dynamique a
 * blog-app/src/app/blog/sitemap.ts, deja reference dans robots.txt : ce
 * script ne le concerne pas.
 *
 * Usage : node scripts/generate-sitemap.mjs [--write]
 * Sans --write, le script affiche seulement les ecarts detectes (dry-run).
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITEMAP_PATH = join(ROOT, "sitemap.xml");
const BASE_URL = "https://alcalspark.com";

const SCAN_DIRS = [
  { dir: ROOT, prefix: "", defaultPriority: "0.7" },
  { dir: join(ROOT, "services"), prefix: "services/", defaultPriority: "0.7" },
  { dir: join(ROOT, "portfolio"), prefix: "portfolio/", defaultPriority: "0.6" },
];

const EXCLUDE_FILES = new Set(["index.html"]); // traite a part -> "/"

function isNoindex(filePath) {
  const html = readFileSync(filePath, "utf-8");
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
}

function collectRealUrls() {
  const urls = new Map(); // loc -> { priority }

  // Page d'accueil
  if (!isNoindex(join(ROOT, "index.html"))) {
    urls.set(`${BASE_URL}/`, { priority: "1.0" });
  }

  for (const { dir, prefix, defaultPriority } of SCAN_DIRS) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".html")) continue;
      if (prefix === "" && EXCLUDE_FILES.has(entry)) continue;
      const filePath = join(dir, entry);
      if (isNoindex(filePath)) continue;
      const slug = entry.replace(/\.html$/, "");
      const loc = `${BASE_URL}/${prefix}${slug}`;
      urls.set(loc, { priority: defaultPriority });
    }
  }

  return urls;
}

function parseExistingSitemap() {
  const xml = readFileSync(SITEMAP_PATH, "utf-8");
  const entries = new Map();
  const blockRe = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>\s*<changefreq>([^<]*)<\/changefreq>\s*<priority>([^<]*)<\/priority>\s*<\/url>/g;
  let m;
  while ((m = blockRe.exec(xml))) {
    entries.set(m[1], { lastmod: m[2], changefreq: m[3], priority: m[4] });
  }
  return entries;
}

function main() {
  const write = process.argv.includes("--write");
  const today = new Date().toISOString().slice(0, 10);

  const realUrls = collectRealUrls();
  const existing = parseExistingSitemap();

  const missing = [...realUrls.keys()].filter((loc) => !existing.has(loc));
  const stale = [...existing.keys()].filter((loc) => !realUrls.has(loc));

  if (missing.length === 0 && stale.length === 0) {
    console.log("[sitemap] A jour : aucune page reelle manquante, aucune URL obsolete.");
    return;
  }

  if (missing.length) {
    console.log(`[sitemap] URLs reelles absentes du sitemap (${missing.length}) :`);
    missing.forEach((loc) => console.log(`  + ${loc}`));
  }
  if (stale.length) {
    console.log(`[sitemap] URLs du sitemap sans fichier .html correspondant (${stale.length}), a verifier manuellement (page supprimee/renommee ?) :`);
    stale.forEach((loc) => console.log(`  - ${loc}`));
  }

  if (!write) {
    console.log("\n[sitemap] Dry-run. Relance avec --write pour ajouter les URLs manquantes (les URLs obsoletes ne sont jamais supprimees automatiquement).");
    return;
  }

  if (missing.length === 0) {
    console.log("\n[sitemap] Rien a ecrire (aucune URL manquante).");
    return;
  }

  for (const loc of missing) {
    existing.set(loc, {
      lastmod: today,
      changefreq: "monthly",
      priority: realUrls.get(loc).priority,
    });
  }

  const body = [...existing.entries()]
    .map(
      ([loc, { lastmod, changefreq, priority }]) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join("\n\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${body}\n\n</urlset>\n`;
  writeFileSync(SITEMAP_PATH, xml, "utf-8");
  console.log(`\n[sitemap] ${missing.length} URL(s) ajoutee(s) a sitemap.xml.`);
}

main();
