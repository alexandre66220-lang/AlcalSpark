#!/usr/bin/env node
/**
 * Audit SEO des pages publiees (dossier de build, apres application de site.config.json).
 *
 *  - <title> present, unique, 60 caracteres maximum
 *  - meta description presente, unique, 155 caracteres maximum
 *  - un seul <h1>
 *  - canonical = URL propre de la page (sans .html)
 *  - og:title / og:description / og:url / og:image presents, og:url = canonical,
 *    twitter:card + twitter:title / twitter:description alignes sur og:*
 *  - toutes les <img> ont un attribut alt
 *  - hreflang : fr + en + x-default, reciproque (la page EN pointe vers la page FR et inversement)
 *  - JSON-LD : JSON valide, aucune note/avis (AggregateRating, Review), FAQPage present si une FAQ est affichee,
 *    BreadcrumbList sur les pages internes (dernier element = canonical), entite ProfessionalService
 *
 * Usage : node scripts/seo-audit.mjs [dossier]   (defaut : ./out, a produire avec build.sh)
 * Code de sortie 1 si au moins un defaut est trouve. Le blog (Next.js/Sanity) n'est pas concerne.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(process.argv[2] || join(ROOT, "out"));
if (!existsSync(dir)) { console.error(`Dossier ${dir} absent : lancer build.sh d'abord.`); process.exit(2); }
const SKIP = new Set(["blog", "_next", "node_modules", ".git", "assets", "js", "css", "data", "netlify"]);
const BASE = "https://alcalspark.com";

function walk(d, out = []) {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) { if (!SKIP.has(e)) walk(f, out); }
    else if (e.endsWith(".html")) out.push(f);
  }
  return out;
}
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(+d)).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const attr = (html, re) => { const m = html.match(re); return m ? decode(m[1]).trim() : null; };
const val = (m) => (m ? decode(m[1] ?? m[2]).trim() : null);
const meta = (html, key, kind = "name") =>
  val(html.match(new RegExp(`<meta\\s+${kind}=["']${key}["']\\s+content=(?:"([^"]*)"|'([^']*)')`, "i"))) ??
  val(html.match(new RegExp(`<meta\\s+content=(?:"([^"]*)"|'([^']*)')\\s+${kind}=["']${key}["']`, "i")));

const pages = walk(dir).map((f) => {
  const html = readFileSync(f, "utf-8");
  const rel = relative(dir, f).replace(/\\/g, "/");
  const slug = rel.replace(/\.html$/, "");
  const url = slug === "index" ? `${BASE}/` : slug === "en/index" ? `${BASE}/en/` : `${BASE}/${slug}`;
  return { f, rel, url, html, noindex: /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html) };
});

// Articles de blog statiques (copies dans /blog/<slug>/ par build.sh) : audites depuis leur source.
const staticDir = join(ROOT, "blog-static");
if (existsSync(staticDir)) {
  for (const slug of readdirSync(staticDir)) {
    const f = join(staticDir, slug, "index.html");
    if (!existsSync(f)) continue;
    const html = readFileSync(f, "utf-8");
    pages.push({ f, rel: `blog/${slug}/`, url: `${BASE}/blog/${slug}/`, html, noindex: false, isBlogStatic: true });
  }
}

const defects = [];
const bad = (p, msg) => defects.push(`${p.rel}: ${msg}`);
const titles = new Map(), descs = new Map();

for (const p of pages) {
  const { html } = p;
  const title = attr(html, /<title>([^<]*)<\/title>/);
  const desc = meta(html, "description");
  const h1s = (html.replace(/<script[\s\S]*?<\/script>/g, "").match(/<h1[\s>]/g) || []).length;
  if (!title) bad(p, "<title> absent");
  else {
    if ([...title].length > 60) bad(p, `title trop long (${[...title].length}) : "${title}"`);
    (titles.get(title) || titles.set(title, []).get(title)).push(p.rel);
  }
  if (!desc) bad(p, "meta description absente");
  else {
    if ([...desc].length > 155) bad(p, `description trop longue (${[...desc].length}) : "${desc.slice(0, 70)}..."`);
    (descs.get(desc) || descs.set(desc, []).get(desc)).push(p.rel);
  }
  if (h1s !== 1) bad(p, `${h1s} balise(s) h1 (attendu : 1)`);
  const canon = attr(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/);
  if (!canon) bad(p, "canonical absent");
  else if (canon !== p.url) bad(p, `canonical ${canon} (attendu ${p.url})`);
  const ogT = meta(html, "og:title", "property"), ogD = meta(html, "og:description", "property");
  const ogU = meta(html, "og:url", "property"), ogI = meta(html, "og:image", "property");
  if (!ogT) bad(p, "og:title absent");
  if (!ogD) bad(p, "og:description absent");
  if (!ogI) bad(p, "og:image absent");
  if (!ogU) bad(p, "og:url absent");
  else if (canon && ogU !== canon) bad(p, `og:url ${ogU} different du canonical`);
  if (title && ogT && title !== ogT && !/^(AlcalSpark)/.test(ogT) && ogT.length > 70) bad(p, "og:title trop long");
  if (!meta(html, "twitter:card")) bad(p, "twitter:card absent");
  const twT = meta(html, "twitter:title"), twD = meta(html, "twitter:description");
  if (!twT) bad(p, "twitter:title absent"); else if (ogT && twT !== ogT) bad(p, "twitter:title different de og:title");
  if (!twD) bad(p, "twitter:description absent"); else if (ogD && twD !== ogD) bad(p, "twitter:description different de og:description");
  for (const m of html.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) bad(p, `image sans alt : ${m[0].slice(0, 90)}`);
  }
  // hreflang
  const alts = [...html.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["']/g)].map((m) => [m[1], m[2]]);
  const map = Object.fromEntries(alts);
  // Une paire FR/EN existe si la page jumelle est publiee : hreflang obligatoire dans ce cas, interdit sinon.
  const twinRel = p.rel.startsWith("en/") ? p.rel.slice(3) : (p.rel === "agences.html" ? "en/agencies.html" : `en/${p.rel}`);
  const hasTwin = pages.some((q) => q.rel === twinRel) || (p.rel === "en/agencies.html" && pages.some((q) => q.rel === "agences.html"));
  p.hasTwin = hasTwin;
  if (!hasTwin && alts.length) bad(p, "hreflang declare alors qu'aucune page jumelle n'existe");
  if (hasTwin) {
    for (const l of ["fr", "en", "x-default"]) if (!map[l]) bad(p, `hreflang ${l} absent`);
    if (map.fr && map.en) {
      const here = canon || p.url;
      if (p.rel.startsWith("en/") ? map.en !== here : map.fr !== here) bad(p, `hreflang auto-reference incorrecte (${p.rel.startsWith("en/") ? map.en : map.fr})`);
      if (map["x-default"] && map["x-default"] !== map.fr) bad(p, "x-default doit pointer vers la version FR");
    }
  }
  p.alt = map;
  // JSON-LD
  const types = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let j;
    try { j = JSON.parse(m[1]); } catch (e) { bad(p, `JSON-LD invalide (${e.message})`); continue; }
    const walkLd = (o) => {
      if (Array.isArray(o)) return o.forEach(walkLd);
      if (o && typeof o === "object") {
        if (o["@type"]) types.push(...[].concat(o["@type"]));
        for (const k of Object.keys(o)) { if (/^(aggregateRating|review|ratingValue|reviewCount)$/i.test(k)) bad(p, `JSON-LD : propriete ${k} interdite (aucun avis ni note)`); walkLd(o[k]); }
      }
    };
    walkLd(j);
    if (j["@type"] === "BreadcrumbList") {
      const items = j.itemListElement || [];
      const last = items[items.length - 1];
      if (canon && last && last.item !== canon) bad(p, `BreadcrumbList : dernier element ${last.item} different du canonical`);
    }
  }
  const hasFaqHtml = /class="(?:faq-item|hm-faq)/.test(html) || /<h2[^>]*>\s*(?:FAQ|Questions fr[ée]quentes|Frequently asked questions)\s*<\/h2>/i.test(html);
  if (hasFaqHtml && !types.includes("FAQPage")) bad(p, "FAQ affichee sans JSON-LD FAQPage");
  if (!hasFaqHtml && types.includes("FAQPage")) bad(p, "JSON-LD FAQPage sans FAQ affichee");
  if (types.includes("LocalBusiness")) bad(p, "entite LocalBusiness : utiliser ProfessionalService");
  if (!p.noindex && !p.rel.endsWith("index.html") && !types.includes("BreadcrumbList") && !/^(brief-|contact-merci|cgv|mentions)/.test(p.rel.replace(/^en\//, ""))) bad(p, "BreadcrumbList absent");
}
for (const [t, list] of titles) if (list.length > 1) defects.push(`title en double "${t}" : ${list.join(", ")}`);
for (const [d, list] of descs) if (list.length > 1) defects.push(`description en double "${d.slice(0, 60)}..." : ${list.join(", ")}`);
// hreflang reciproque
const byUrl = new Map(pages.map((p) => [p.url, p]));
for (const p of pages) {
  for (const l of ["fr", "en"]) {
    const target = p.alt?.[l];
    if (!target) continue;
    const q = byUrl.get(target);
    if (!q) { bad(p, `hreflang ${l} vers une page inexistante : ${target}`); continue; }
    const back = q.alt?.[p.rel.startsWith("en/") ? "en" : "fr"];
    if (back !== p.url) bad(p, `hreflang non reciproque avec ${q.rel}`);
  }
}
if (defects.length) {
  console.error(`SEO audit : ${defects.length} defaut(s) sur ${pages.length} pages\n  - ` + defects.join("\n  - "));
  process.exit(1);
}
console.log(`SEO audit OK : ${pages.length} pages (title, description, h1, canonical, og/twitter, alt, hreflang).`);
