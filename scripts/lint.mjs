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
 *  6. Sitemap : pages de l'offre presentes, toute page publique (indexable) presente,
 *     pages noindex absentes.
 *  7. CGV : page /cgv en noindex tant qu'elle porte le marqueur "A COMPLETER",
 *     case CGV obligatoire dans les deux questionnaires de brief.
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

// Acompte / solde : montants derives du prix fixe (CGV, article 4).
{
  const prix = Number(config.PRIX_FIXE);
  const pa = Number(config.ACOMPTE_POURCENT), ps = Number(config.SOLDE_POURCENT);
  if (pa + ps !== 100) fail("config", `ACOMPTE_POURCENT (${pa}) + SOLDE_POURCENT (${ps}) doit valoir 100.`);
  if (Number(config.ACOMPTE_MONTANT) !== (prix * pa) / 100) fail("config", `ACOMPTE_MONTANT (${config.ACOMPTE_MONTANT}) ne correspond pas a ${pa} % de PRIX_FIXE (${prix}).`);
  if (Number(config.SOLDE_MONTANT) !== (prix * ps) / 100) fail("config", `SOLDE_MONTANT (${config.SOLDE_MONTANT}) ne correspond pas a ${ps} % de PRIX_FIXE (${prix}).`);
  if (Number(config.ACOMPTE_MONTANT) + Number(config.SOLDE_MONTANT) !== prix) fail("config", "ACOMPTE_MONTANT + SOLDE_MONTANT doit valoir PRIX_FIXE.");
}

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

// Toute page indexable (sans noindex) doit etre dans le sitemap ; toute page noindex en est exclue.
const sitemapLocs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
for (const f of htmlFiles) {
  const r = rel(f).replace(/\\/g, "/");
  const slug = r.replace(/\.html$/, "");
  const loc = slug === "index" ? "https://alcalspark.com/" : slug === "en/index" ? "https://alcalspark.com/en/" : `https://alcalspark.com/${slug}`;
  const noindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(readFileSync(f, "utf-8"));
  if (!noindex && !sitemapLocs.has(loc)) fail("sitemap", `${r} est indexable mais absent de sitemap.xml (npm run fix-sitemap)`);
  if (noindex && sitemapLocs.has(loc)) fail("sitemap", `${r} est en noindex mais present dans sitemap.xml`);
}

/* 7. CGV ------------------------------------------------------------- */
const cgvFile = join(ROOT, "cgv.html");
if (!existsSync(cgvFile)) {
  fail("cgv", "cgv.html est absent");
} else {
  const cgv = readFileSync(cgvFile, "utf-8");
  const visible = cgv.replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  // Champs a completer : <span class="cgv-field">[...]</span> ou tout crochet dans le texte des articles.
  const article = (visible.match(/<main>[\s\S]*<\/main>/) || [""])[0];
  const fields = [...article.matchAll(/\[[^\]<>]{1,120}\]/g)].map((m) => m[0]);
  const draft = /À COMPLÉTER|A COMPLETER/.test(visible) || fields.length > 0;
  if (draft && !/<meta name="robots" content="noindex/.test(cgv)) {
    fail("cgv", `cgv.html contient encore des champs a completer (${fields.length}) ou le bandeau 'À COMPLÉTER' : elle doit rester en noindex`);
  }
  if (fields.length > 0 && !/À COMPLÉTER ET FAIRE VALIDER/.test(visible)) {
    fail("cgv", "cgv.html contient des champs entre crochets mais plus le bandeau 'À COMPLÉTER ET FAIRE VALIDER'");
  }
  if (fields.length === 0 && /À COMPLÉTER ET FAIRE VALIDER/.test(visible)) {
    console.warn("[cgv] avertissement : plus aucun champ entre crochets, retirer le bandeau et le noindex, puis lancer npm run fix-sitemap.");
  }
  // Valeurs chiffrees : jamais en dur, toujours via les jetons de site.config.json.
  const hard = [
    [config.PRIX_FIXE, "{{PRIX_FIXE}}"],
    [config.PRIX_MAINTENANCE, "{{PRIX_MAINTENANCE}}"],
    [config.ACOMPTE_MONTANT, "{{ACOMPTE_MONTANT}}"],
    [config.SOLDE_MONTANT, "{{SOLDE_MONTANT}}"],
  ];
  for (const [n, token] of hard) {
    if (new RegExp(`(?<![0-9{])${n}\\s*€`).test(article)) fail("cgv", `montant ${n} € ecrit en dur dans cgv.html, utiliser ${token}`);
  }
  if (article.includes(String(config.HORAIRES_RAPPEL))) fail("cgv", "creneau de rappel ecrit en dur dans cgv.html, utiliser {{HORAIRES_RAPPEL}}");
  for (const t of ["PRIX_FIXE", "PRIX_MAINTENANCE", "ACOMPTE_MONTANT", "ACOMPTE_POURCENT", "SOLDE_MONTANT", "SOLDE_POURCENT", "HORAIRES_RAPPEL", "PRIX_MENTION"]) {
    if (!cgv.includes(`{{${t}}}`)) fail("cgv", `cgv.html n'utilise pas le jeton {{${t}}}`);
  }
}
for (const p of ["brief-site-artisan-btp.html", "en/brief-site-artisan-btp.html"]) {
  const html = readFileSync(join(ROOT, p), "utf-8");
  if (!/<input[^>]*name="cgv_acceptees"[^>]*\brequired\b/.test(html)) fail("cgv", `${p}: case CGV obligatoire absente`);
  const link = html.match(/<a [^>]*href="(?:\.\.\/)?cgv\.html"[^>]*>/);
  if (!link) fail("cgv", `${p}: lien vers cgv.html absent`);
  else if (!/target="_blank"/.test(link[0]) || !/rel="[^"]*noopener/.test(link[0])) fail("cgv", `${p}: le lien CGV doit s'ouvrir dans un nouvel onglet (target="_blank" rel="noopener")`);
}
// Lien CGV dans le pied de page de chaque page.
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf-8");
  if (!/<li><a href="(?:\.\.\/)*cgv\.html">/.test(html)) fail("cgv", `${rel(f)}: lien CGV absent du pied de page`);
}

/* 8. Numeros decoratifs : toujours via le token --accent-num (contraste >= 3:1),
      jamais une couleur rgba() ecrite en dur, y compris dans une media query. */
for (const [file, selectors] of [
  ["css/services.css", [".sr-num", ".ssc-num", ".si-num"]],
  ["css/glass.css", [".ssc-num,\n.si-num"]],
  ["css/seo-local.css", [".seo-process-step .step-num"]],
]) {
  const css = readFileSync(join(ROOT, file), "utf-8");
  for (const sel of selectors) {
    const re = new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
    for (const m of css.matchAll(re)) {
      if (/\bcolor\s*:/.test(m[1]) && !/color\s*:\s*var\(--accent-num\)/.test(m[1])) {
        fail("numeros", `${file}: ${sel} doit utiliser color: var(--accent-num)`);
      }
    }
  }
}

/* Bilan -------------------------------------------------------------- */
if (errors.length) {
  console.error(`\nLint : ${errors.length} probleme(s)\n  - ` + errors.join("\n  - "));
  process.exit(1);
}
console.log(`Lint OK : ${htmlFiles.length} pages HTML, ${walk(join(ROOT, "js"), ".js").length} scripts JS verifies.`);
