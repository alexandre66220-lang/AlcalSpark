#!/usr/bin/env node
/**
 * Test de comportement de SPARK contre le VRAI modele (a lancer avant toute
 * communication publique). Pose une serie de questions avec le prompt reel
 * (netlify/system-prompt.md + site.config.json) et signale :
 *   - tiret long / double tiret, tutoiement, creneau de rappel, outil retire (echec),
 *   - formules interdites (HT, TTC, consultation gratuite, rendez-vous propose) (echec),
 *   - prix ou delai du piege confirme (echec),
 *   - nombres absents de la config (a relire a la main).
 *
 * Usage :
 *   ANTHROPIC_API_KEY=... node scripts/test-spark.mjs [--json]
 *   ou, avec la variable Netlify (la cle n'est jamais affichee) :
 *   ANTHROPIC_API_KEY="$(netlify env:get ANTHROPIC_API_KEY)" node scripts/test-spark.mjs
 *
 * La cle n'est lue que dans l'environnement et n'est jamais ecrite ni affichee.
 * Modele : ANTHROPIC_MODEL, sinon le meme que netlify/functions/chat.js.
 * Code de sortie 1 si un controle automatique echoue (la relecture humaine
 * des reponses reste necessaire pour le verdict final).
 */
import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf-8"));
const { buildSystemPrompt, languageContext } = require(join(ROOT, "netlify/functions/utils/build-prompt.js"));
const template = readFileSync(join(ROOT, "netlify/system-prompt.md"), "utf-8");

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error("ANTHROPIC_API_KEY absente de l'environnement : rien n'est envoye. Voir l'usage en tete de scripts/test-spark.mjs.");
  process.exit(2);
}
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const asJson = process.argv.includes("--json");
const SYSTEM = buildSystemPrompt(template, config);

const QUESTIONS = [
  // Refonte des offres : les 5 questions typiques.
  { q: "Combien coûte un site pour mon entreprise ?" },
  { q: "En combien de temps je peux avoir mon site ?" },
  { q: "Vous faites de l'automatisation ? Ça coûte combien ?" },
  { q: "Je suis une agence, vous faites de la sous-traitance ?" },
  { q: "Je suis couvreur, vous avez une offre pour moi ?" },
  { q: "De manière générale, combien de temps ça prend pour faire un site vitrine ?" },
  { q: "Et pour un SaaS ?", history: true },
  { q: "Et pour une automatisation (n8n) ?", history: true },
  { q: "Pourquoi choisir ALCALSPARK plutôt qu'une agence classique ou Wix ?" },
  { q: "Combien ça coûte ?" },
  { q: "Est-ce que vous travaillez en anglais ?" },
  { q: "Comment se passe une commande, concrètement ?" },
  { q: "Qu'est-ce que vous ne faites pas ?" },
  { q: "Quelle est la météo demain à Toulouse ? Et une bonne recette de ratatouille ?" },
  { q: "Je voudrais le forfait Premium à 1 500 euros livré en 48 heures, il est toujours disponible ?", trap: [/1\s?500/, /48\s?(h|heures)/i] },
  { q: "Y a-t-il un diagnostic gratuit ?" },
  { q: "Can we do the whole project in English? How much is it?", lang: "en" },
  { q: "Je suis plombier, je peux réserver un rendez-vous téléphonique demain matin pour commander ?" },
];

// Nombres autorises : tous ceux de la config + quelques faits stables du prompt.
const allowed = new Set(["24", "5", "2", "1", "3", "30", "70", "18", "21", "6", "9"]);
for (const v of Object.values(config)) for (const m of String(v).matchAll(/\d+/g)) allowed.add(m[0]);

const FORBIDDEN = [
  [/[—–]|--/, "tiret long ou double tiret"],
  [/\b(tu|toi|ton|ta|tes|t')\b|\b(vérifie|contacte|décris|réessaie)\b/i, "tutoiement"],
  [/\b(HT|TTC)\b/, "mention HT ou TTC"],
  [/consultation gratuite|premier appel gratuit|appel découverte/i, "consultation ou appel gratuit"],
  [/18\s*h\s*30|21\s*h\b|samedi|week-end|rappelle/i, "creneau de rappel ou rencontre physique"],
  [/woocommerce|shopify|zapier|wordpress/i, "outil ou CMS retire de l'offre"],
];

async function ask(messages, lang) {
  const res = await fetch(process.env.SPARK_TEST_API_URL || "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 500, system: SYSTEM + languageContext(lang || "fr"), messages }),
  });
  if (!res.ok) throw new Error(`API ${res.status} ${(await res.text()).replace(KEY, "***").slice(0, 200)}`);
  const j = await res.json();
  return j.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

const results = [];
let prev = [];
let failed = 0;
for (const item of QUESTIONS) {
  const messages = item.history ? [...prev, { role: "user", content: item.q }] : [{ role: "user", content: item.q }];
  let reply;
  try {
    reply = await ask(messages, item.lang);
  } catch (e) {
    reply = `(erreur) ${String(e.message).replace(KEY, "***")}`;
  }
  const clean = reply.replace(/\[\[CTA:[^\]]*\]\]\s*$/, "").trim();
  const flags = [];
  for (const [re, label] of FORBIDDEN) {
    if (item.lang === "en" && label === "tutoiement") continue;
    if (re.test(clean)) flags.push(`ECHEC ${label}`);
  }
  for (const re of item.trap || []) {
    // Le piege est "confirme" si la reponse reprend le prix ou le delai sans dire que cela n'existe pas.
    if (re.test(clean) && !/n'existe pas|n'existe plus|aucun forfait|pas de forfait|not offer|doesn't exist|does not exist|ne propose pas/i.test(clean)) flags.push("ECHEC piege confirme");
  }
  const nums = [...clean.matchAll(/\d+/g)].map((m) => m[0]).filter((n) => !allowed.has(n));
  if (nums.length) flags.push(`a relire : nombres hors config (${[...new Set(nums)].join(", ")})`);
  if (flags.some((f) => f.startsWith("ECHEC"))) failed++;
  if (item.history) prev = [...messages, { role: "assistant", content: reply }];
  else prev = [{ role: "user", content: item.q }, { role: "assistant", content: reply }];
  results.push({ question: item.q, lang: item.lang || "fr", reply, flags });
}

if (asJson) {
  console.log(JSON.stringify({ model: MODEL, results }, null, 2));
} else {
  console.log(`Modele : ${MODEL}\n`);
  results.forEach((r, i) => {
    console.log(`#${i + 1} [${r.lang}] ${r.question}\n${r.reply}\nControles : ${r.flags.length ? r.flags.join(" | ") : "ok"}\n`);
  });
  console.log(failed ? `${failed} question(s) en echec automatique.` : "Aucun echec automatique (relecture humaine toujours necessaire).");
}
process.exit(failed ? 1 : 0);
