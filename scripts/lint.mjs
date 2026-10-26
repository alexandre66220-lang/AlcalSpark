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
 * 10. Articles de blog statiques : canonical, h1 unique, JSON-LD (BlogPosting, FAQPage), sitemap, liste du blog.
 *  9. Refonte des offres : termes retires du site (WooCommerce, Shopify, Zapier, creneau
 *     de rappel, "tarifs adaptes", "un projet a la fois"), navigation et pied de page
 *     (Automatisation IA, Agences), pages agences FR/EN, hreflang, ligne de sous-traitance.
 *
 * Usage : node scripts/lint.mjs   (code de sortie 1 si une verification echoue)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf-8"));
const SKIP = new Set(["node_modules", ".git", "out", "blog-app", "blog-static", "design_handoff_alcalspark_da", "netlify", ".claude", "captures-fix-visuel", "captures-hero"]);

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
for (const k of ["PRIX_ESSENTIEL", "PRIX_PREMIUM", "PRIX_SUR_MESURE_DES", "PRIX_AUTOMATISATION_LEADS", "PRIX_AUTOMATISATION_COMPLET", "PRIX_AUDIT", "PRIX_AGENCE_MIN", "PRIX_AGENCE_MAX", "CAPACITE_PROJETS_MOIS", "PAIEMENT_PACK_ACOMPTE_POURCENT", "PAIEMENT_PACK_SOLDE_POURCENT", "PAIEMENT_SURMESURE_1_POURCENT", "PAIEMENT_SURMESURE_2_POURCENT", "PAIEMENT_SURMESURE_3_POURCENT", "DELAI_ESSENTIEL_JOURS", "DELAI_PREMIUM_JOURS", "DELAI_AUTOMATISATION_JOURS", "DELAI_AUDIT_HEURES"]) {
  if (!(Number(config[k]) > 0)) fail("config", `${k} doit etre un nombre positif.`);
}
if (Number(config.PRIX_AGENCE_MIN) > Number(config.PRIX_AGENCE_MAX)) fail("config", "PRIX_AGENCE_MIN doit etre inferieur ou egal a PRIX_AGENCE_MAX.");
if (!(Number(config.PRIX_ESSENTIEL) < Number(config.PRIX_PREMIUM) && Number(config.PRIX_PREMIUM) < Number(config.PRIX_SUR_MESURE_DES))) fail("config", "La grille doit etre croissante : Essentiel < Premium < Sur-mesure.");
if (truthy(config.PAGESPEED_MOBILE) !== truthy(config.PAGESPEED_DESKTOP)) fail("config", "PAGESPEED_MOBILE et PAGESPEED_DESKTOP doivent etre renseignes ensemble (ou tous deux vides).");
for (const k of ["PAGESPEED_MOBILE", "PAGESPEED_DESKTOP"]) {
  if (truthy(config[k]) && !(Number(config[k]) >= 0 && Number(config[k]) <= 100)) fail("config", `${k} doit etre un score entre 0 et 100 (mesure reelle uniquement).`);
}

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
const promptTemplate = readFileSync(join(ROOT, "netlify/system-prompt.md"), "utf-8");
for (const k of Object.keys(config)) {
  if (promptTemplate.includes(`{{${k}}}`)) usedKeys.add(k); // jeton utilise par le prompt de SPARK
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
  for (const t of ["PRIX_FIXE", "PRIX_MAINTENANCE", "ACOMPTE_MONTANT", "ACOMPTE_POURCENT", "SOLDE_MONTANT", "SOLDE_POURCENT", "PRIX_MENTION", "PAIEMENT_PACK_ACOMPTE_POURCENT", "PAIEMENT_SURMESURE_3_POURCENT"]) {
    if (!cgv.includes(`{{${t}}}`)) fail("cgv", `cgv.html n'utilise pas le jeton {{${t}}}`);
  }
}
for (const p of ["brief-site-artisan-btp.html", "en/brief-site-artisan-btp.html"]) {
  const html = readFileSync(join(ROOT, p), "utf-8");
  if (!/<input[^>]*name="cgv_acceptees"[^>]*\brequired\b/.test(html)) fail("cgv", `${p}: case CGV obligatoire absente`);
  const link = html.match(/<a [^>]*href="\/cgv"[^>]*>/);
  if (!link) fail("cgv", `${p}: lien vers cgv.html absent`);
  else if (!/target="_blank"/.test(link[0]) || !/rel="[^"]*noopener/.test(link[0])) fail("cgv", `${p}: le lien CGV doit s'ouvrir dans un nouvel onglet (target="_blank" rel="noopener")`);
}
// Lien CGV dans le pied de page de chaque page.
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf-8");
  if (!/<li><a href="\/cgv">/.test(html)) fail("cgv", `${rel(f)}: lien CGV absent du pied de page`);
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


/* 9. Refonte des offres ---------------------------------------------- */
const publicHtml = htmlFiles.filter((f) => !/portfolio\/|ressources\//.test(rel(f).replace(/\\/g, "/")));
const visibleText = (f) => readFileSync(f, "utf-8").replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<style\b[\s\S]*?<\/style>/g, "").replace(/<!--[\s\S]*?-->/g, "");
const BANNED = [
  [/woocommerce|shopify|zapier|prestashop/i, "outil ou CMS retire de l'offre"],
  [/\bMake\s*(?:·|\/|,|\.com)|\bMake\b\s+et\s+Zapier/i, "Make retire de l'offre (n8n uniquement)"],
  [/18\s*h\s*30|21\s*h\b/, "creneau de rappel 18h30-21h"],
  [/tarifs? adaptés? (?:au marché|aux)|agences? parisiennes?|adapté à tous les budgets|tarifs accessibles/i, "wording de prix retire"],
  [/un (?:seul )?projet à la fois|one project at a time|one at a time/i, "'un projet a la fois' (remplace par la capacite mensuelle)"],
  [/rencontre possible|le samedi|Saturday|soir ou le week-end|evening or at the weekend|en venant directement à notre studio|come to our studio/i, "rencontre physique"],
  [/ces tarifs sont des repères/i, "'repères, pas des prix fixes'"],
  [/90\s?€\s?\/\s?h|350\s?€\s?\/\s?mois/, "consultation ou accompagnement retire de la grille"],
];
for (const f of publicHtml) {
  const txt = visibleText(f);
  for (const [re, label] of BANNED) {
    const m = txt.match(re);
    if (m) fail("refonte", `${rel(f)}: ${label} ("${m[0]}")`);
  }
  // CMS / WordPress : uniquement dans la formule "sans WordPress".
  for (const m of txt.matchAll(/\bCMS\b|WordPress/g)) {
    const ctx = txt.slice(Math.max(0, m.index - 12), m.index + 12);
    if (!/(sans|without|no) WordPress/i.test(ctx)) fail("refonte", `${rel(f)}: mention ${m[0]} a retirer (code sur mesure, sans WordPress)`);
  }
  if (/2 à 3 semaines|2 to 3 weeks|2 et 3 semaines|between 2 and 3 weeks/i.test(txt)) fail("refonte", `${rel(f)}: ancien delai '2 a 3 semaines' (utiliser DELAI_PLAGE ou DELAI_SITE_ARTISAN)`);
  if (/MVP en \d|MVP in \d|premier MVP|first MVP/i.test(txt)) fail("refonte", `${rel(f)}: delai MVP chiffre (SaaS : delai defini au devis)`);
  // Pages EN : pas de page de zone ni de lien vers elles.
  if (rel(f).replace(/\\/g, "/").startsWith("en/") && /creation-site-web-/.test(readFileSync(f, "utf-8"))) fail("refonte", `${rel(f)}: lien vers une page de zone (pas de zones en anglais)`);
}

// Navigation : lien Automatisation IA (menu desktop, mobile, pied de page) et lien Agences (pied de page).
for (const f of publicHtml) {
  const html = readFileSync(f, "utf-8");
  const r = rel(f).replace(/\\/g, "/");
  if (!/automatisation-ia"[^>]*class="nav-link[^"]*">(?:Automatisation IA|AI Automation|AI automation)</.test(html)) fail("refonte", `${r}: lien 'Automatisation IA' absent du menu`);
  const navHtml = (html.match(/<nav id="navbar"[\s\S]*?<\/nav>/) || [""])[0] + (html.match(/<div class="nav-mobile"[\s\S]*?<\/div>/) || [""])[0];
  if (!/offre-site-artisan-btp/.test(r) && /offre-site-artisan-btp/.test(navHtml)) fail("refonte", `${r}: l'offre BTP ne doit pas figurer dans le menu`);
  if (!/(?:agences|agencies)">(?:Agences|Agencies)</.test(html)) fail("refonte", `${r}: lien Agences absent du pied de page`);
  if (/class="nav-mobile-cta"[^>]*>[^<]*<\/a>/.test(html)) {
    const cta = html.match(/<a href="([^"]*)" class="nav-mobile-cta"/);
    if (cta && !/(?:^|\/)contact$/.test(cta[1])) fail("refonte", `${r}: le CTA du menu mobile doit pointer vers /contact (trouve ${cta[1]})`);
  }
}

// Pages agences FR/EN : existence, tokens, mailto avec objet prerempli, hreflang reciproque, sitemap.
for (const [file, subject, other, url] of [
  ["agences.html", "Collaboration%20%2F%20sous-traitance", "en/agencies", "https://alcalspark.com/agences"],
  ["en/agencies.html", "Collaboration%20%2F%20subcontracting", "agences", "https://alcalspark.com/en/agencies"],
]) {
  const abs = join(ROOT, file);
  if (!existsSync(abs)) { fail("refonte", `${file} est absent`); continue; }
  const html = readFileSync(abs, "utf-8");
  if (!html.includes(`mailto:contact@alcalspark.com?subject=${subject}`)) fail("refonte", `${file}: mailto avec objet prerempli absent`);
  if (!html.includes(`hreflang="${file.startsWith("en/") ? "fr" : "en"}" href="https://alcalspark.com/${other}"`)) fail("refonte", `${file}: hreflang vers ${other} absent`);
  if (!sitemap.includes(`<loc>${url}</loc>`)) fail("sitemap", `${url} absent de sitemap.xml`);
  if (!new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")}</loc>\\s*<xhtml:link rel="alternate" hreflang="fr"`).test(sitemap)) fail("sitemap", `${url}: annotations hreflang absentes du sitemap`);
}
if (!existsSync(join(ROOT, "en/services/automatisation-ia.html"))) fail("refonte", "en/services/automatisation-ia.html est absent");

// hreflang : une seule annotation par langue et par page.
for (const f of htmlFiles) {
  const langs = [...readFileSync(f, "utf-8").matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
  const dup = langs.find((l, i) => langs.indexOf(l) !== i);
  if (dup) fail("refonte", `${rel(f)}: hreflang="${dup}" declare plusieurs fois`);
}

// Liens internes : URLs propres (pas de .html : Netlify redirige en 301) ; les pages /en/ pointent vers /en/.
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf-8").replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const r = rel(f).replace(/\\/g, "/");
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|tel:|#)/.test(h) || h.includes("{{")) continue;
    if (/\.html(#|$)/.test(h)) fail("liens", `${r}: lien interne avec .html ("${h}"), utiliser l'URL propre (301 Netlify sinon)`);
    if (r.startsWith("en/") && h.startsWith("/") && !h.startsWith("/en/") && !/hreflang="fr"|lang="fr"/.test(m[0])) {
      const path = h.split("#")[0].replace(/\/$/, "");
      if (path && existsSync(join(ROOT, "en", `${path}.html`))) fail("liens", `${r}: lien vers la version francaise "${h}" alors que /en${path} existe`);
    }
  }
}
// Redirections 301 de l'ancienne URL automatisation (nom local) vers /services/automatisation-ia.
{
  const toml = readFileSync(join(ROOT, "netlify.toml"), "utf-8");
  for (const from of ["/services/automatisation-n8n-castres", "/en/services/automatisation-n8n-castres"]) {
    const to = from.replace("automatisation-n8n-castres", "automatisation-ia");
    const re = new RegExp(`from = "${from}"\\s*\\n\\s*to = "${to}"\\s*\\n\\s*status = 301`);
    if (!re.test(toml)) fail("redirections", `netlify.toml : redirection 301 ${from} -> ${to} absente`);
  }
  for (const f of htmlFiles) if (/automatisation-n8n-castres/.test(readFileSync(f, "utf-8"))) fail("redirections", `${rel(f)}: reference a l'ancienne URL automatisation-n8n-castres`);
}

// Contact : ligne de sous-traitance visible, aucune heure de rappel.
for (const [file, needle] of [
  ["contact.html", "Sous-traitance, collaboration ou partenariat : écrivez-moi à"],
  ["en/contact.html", "Subcontracting, collaboration or partnership inquiries:"],
]) {
  if (!readFileSync(join(ROOT, file), "utf-8").includes(needle)) fail("refonte", `${file}: ligne de sous-traitance absente`);
}

// Accueil et tarifs : sections et textes cles.
for (const [file, needles] of [
  ["index.html", ['id="offres"', 'href="/services/automatisation-ia"', 'href="/tarifs"', "Pour les entreprises", "/agences"]],
  ["en/index.html", ['id="offres"', 'href="/en/services/automatisation-ia"', 'href="/en/tarifs"', "For businesses", "/en/agencies"]],
]) {
  const html = readFileSync(join(ROOT, file), "utf-8");
  for (const n of needles) if (!html.includes(n)) fail("refonte", `${file}: element attendu absent (${n})`);
  if (/offre-site-artisan-btp|Artisan du BTP|Construction trades/.test(html.replace(/<!--[\s\S]*?-->/g, ""))) fail("refonte", `${file}: l'offre BTP ne doit plus apparaitre sur l'accueil`);
  const hero = (html.match(/<h1 class="hero-title"[\s\S]*?<div class="hero-actions">/) || [""])[0];
  if (!/\{\{DELAI_PLAGE(?:_EN)?\}\}/.test(hero) || !hero.includes("{{PRIX_ESSENTIEL}}") || /2 à 3|2 to 3|5 jours|5 days/.test(hero)) fail("refonte", `${file}: le hero doit annoncer le prix Essentiel et la fourchette {{DELAI_PLAGE}} via la config`);
  if (/<h2[^>]*>[^<]*(?:Pourquoi AlcalSpark existe|Why AlcalSpark exists)/i.test(html)) fail("refonte", `${file}: bloc 'Pourquoi AlcalSpark existe' a retirer`);
}
// PageSpeed : uniquement des valeurs reelles de la config, jamais en dur.
for (const f of publicHtml) {
  const txt = visibleText(f);
  if (/PageSpeed[^<]{0,40}\b(?:9\d|100)\b/i.test(txt) && !readFileSync(f, "utf-8").includes("IF:PAGESPEED_MOBILE")) {
    fail("refonte", `${rel(f)}: score PageSpeed ecrit en dur (utiliser PAGESPEED_MOBILE / PAGESPEED_DESKTOP de site.config.json)`);
  }
}
// Offres JSON-LD : la page d'accueil et /tarifs declarent leurs Offers.
for (const f of ["index.html", "en/index.html", "tarifs.html", "en/tarifs.html"]) {
  const html = readFileSync(join(ROOT, f), "utf-8");
  if (!/"@type": "Offer"/.test(html) || !html.includes('"price": "{{PRIX_ESSENTIEL}}"')) fail("refonte", `${f}: makesOffer sans les Offers de la grille`);
  if (/"priceRange": "€€€"/.test(html)) fail("refonte", `${f}: priceRange generique a remplacer`);
}

/* 10. Articles de blog statiques (blog-static/<slug>/index.html) ------- */
{
  const dir = join(ROOT, "blog-static");
  const listed = readFileSync(join(ROOT, "blog-app/lib/staticArticles.ts"), "utf-8");
  for (const slug of existsSync(dir) ? readdirSync(dir) : []) {
    const f = join(dir, slug, "index.html");
    if (!existsSync(f)) { fail("blog", `blog-static/${slug}/index.html est absent`); continue; }
    const html = readFileSync(f, "utf-8");
    const url = `https://alcalspark.com/blog/${slug}/`;
    if (!listed.includes(`current: "${slug}"`)) fail("blog", `${slug} absent de blog-app/lib/staticArticles.ts (liste du blog et sitemap du blog)`);
    if (!sitemap.includes(`<loc>${url}</loc>`)) fail("blog", `${url} absent de sitemap.xml (npm run fix-sitemap)`);
    if (!html.includes(`<link rel="canonical" href="${url}" />`)) fail("blog", `${slug}: canonical attendu ${url}`);
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail("blog", `${slug}: un seul h1 attendu`);
    if (!/"@type":\s*"BlogPosting"/.test(html) || !/"@type":\s*"FAQPage"/.test(html)) fail("blog", `${slug}: JSON-LD BlogPosting et FAQPage attendus`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { fail("blog", `${slug}: JSON-LD invalide (${e.message})`); }
    }
    if (/aggregateRating|"review"/i.test(html)) fail("blog", `${slug}: avis ou note interdits`);
    if (!html.includes("mailto:contact@alcalspark.com?subject=Collaboration%20%2F%20sous-traitance") && /sous-traiter/.test(slug)) fail("blog", `${slug}: lien mailto de collaboration absent`);
    const visible = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
    if (/[—–]/.test(visible)) fail("blog", `${slug}: tiret cadratin ou demi-cadratin dans le texte`);
    for (const m of visible.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) fail("blog", `${slug}: image sans alt`);
  }
}

/* Bilan -------------------------------------------------------------- */
if (errors.length) {
  console.error(`\nLint : ${errors.length} probleme(s)\n  - ` + errors.join("\n  - "));
  process.exit(1);
}
console.log(`Lint OK : ${htmlFiles.length} pages HTML, ${walk(join(ROOT, "js"), ".js").length} scripts JS verifies.`);
