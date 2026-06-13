# Handoff · Appliquer la DA AlcalSpark au site (codé main)

> Paquet destiné à **Claude Code**. Objectif : appliquer la direction artistique (DA)
> AlcalSpark au code source du site existant (HTML/CSS/JS codé à la main, déployé sur Netlify),
> **sans casser** la structure ni le contenu actuels.

---

## 1. Contexte

AlcalSpark est un studio digital premium (Castres, Tarn). Le site est **codé à la main**
(HTML/CSS/JS statique) et déployé sur **Netlify**. Le fondateur a fait valider une charte
graphique complète : il faut maintenant **l'appliquer à son site réel**.

La DA est **haut de gamme, éditoriale, sobre** : vert sapin profond, fond papier chaud à
trame de points, accent or champagne (« spark » ✦), serif éditoriale haute-contraste pour les
titres, grotesque nette pour le texte, labels en CAPITALES espacées, angles quasi-droits.

---

## 2. À propos des fichiers de ce paquet

- `charte/styles.css` + `charte/tokens/*.css` → **le vrai CSS de production**. C'est la source de
  vérité. Tu peux le lier directement, ou recopier ses variables dans le CSS existant du site.
- `pages-reference/*.html` → **références visuelles** (accueil, services, portfolio, à propos).
  Elles montrent le rendu cible et l'usage des tokens. Ce ne sont pas forcément les fichiers
  finaux à livrer tels quels : adapte-les à la structure HTML déjà en place sur le site.
- `charte/assets/` → le monogramme AlcalSpark (versions pine pour fonds clairs, bone pour fonds
  sombres, + l'original).

**Fidélité : haute (hifi).** Couleurs, typo, espacements et états sont définitifs. Reproduis le
rendu fidèlement, en réutilisant la structure et les conventions du code existant.

---

## 3. Méthode recommandée (étape par étape)

1. **Repérer le CSS actuel** du site (un `style.css` global, ou des styles par page).
2. **Intégrer les tokens** : copier `charte/styles.css` + le dossier `charte/tokens/` dans le
   site, puis le lier **avant** le CSS existant :
   ```html
   <link rel="stylesheet" href="/styles.css">   <!-- tokens AlcalSpark -->
   <link rel="stylesheet" href="/css/site.css">  <!-- CSS existant du site -->
   ```
   (Alternative : coller le contenu des 5 fichiers `tokens/*.css` en tête du CSS global.)
3. **Charger les polices** : `tokens/fonts.css` importe déjà Cormorant Garamond, Hanken Grotesk
   et JetBrains Mono depuis Google Fonts. Vérifier que l'import n'est pas dupliqué.
4. **Remplacer les valeurs en dur** du site par les variables CSS (voir §5) :
   couleurs → `var(--pine-600)` etc. ; familles → `var(--font-display)` / `var(--font-sans)`.
5. **Appliquer les patterns** : fond `.as-dotgrid`, titres en serif, labels/nav/boutons en
   CAPITALES espacées, boutons à angles `var(--radius-xs)`.
6. **Remplacer le logo** par `charte/assets/logo-monogram-pine.png` (et la version bone sur fonds
   sombres). Conserver le lockup « Alcal*Spark* » (Spark en italique serif).
7. **Vérifier le responsive** et tester en local (`netlify dev`) avant de pousser.

---

## 4. Règles de marque NON négociables

- **Jamais de tirets longs** (— em, – en) dans le contenu visible. Séparateur = **point médian
  « · »** (motif de marque : *WEB · DESIGN · VISUELS*) ; plage de valeurs = trait d'union simple
  « - ». Reformuler si besoin.
- **Pas d'emoji** dans la communication, sauf l'étincelle **✦** (rare, signature).
- **Voix** : français premium, sobre, affirmé. Phrases courtes. Vouvoiement client / « nous »
  agence. Pas de superlatifs criards.
- **Un seul** bouton primaire (pine) ou or par zone.
- **Dégradé métallique** (`--gold-metallic`) réservé au logo / éléments très premium.

---

## 5. Design tokens (référence rapide)

### Couleurs
| Rôle | Variable | Hex |
|---|---|---|
| Vert signature ★ | `--pine-600` | `#385144` |
| Vert texte fort | `--pine-800` | `#213029` |
| Vert quasi-noir (fonds sombres) | `--pine-950` | `#0E1512` |
| Fond papier ★ | `--bone-100` | `#F8F5F5` |
| Surface / blanc | `--bone-0` | `#FFFFFF` |
| Gris chaud | `--bone-500` | `#8E8884` |
| Encre (points) | `--ink` | `#14130F` |
| Or champagne ✦ | `--gold-500` | `#BF9D5B` |
| Or foncé | `--gold-700` | `#806528` |
| Filet / bordure | `--color-border` | `#DFDCD6` |
| Or métallique (logo) | `--gold-metallic` | dégradé `#EFE0B6→#C8AA6B→#9A7838→#E3CF9C` |

États : success `#3F7D5D` · warning `#BF9D5B` · danger `#B4503C` · info `#4A6F8C`.

### Typographie
- **Titres** : `var(--font-display)` = **Cormorant Garamond**, graisse 600, `letter-spacing -0.02em`,
  interligne ~0.95. **Italique** pour l'emphase (« *magnifiée* »).
- **Texte / UI** : `var(--font-sans)` = **Hanken Grotesk** (300-700).
- **Méta** : `var(--font-mono)` = **JetBrains Mono**.
- **Labels / nav / boutons** : Hanken Grotesk, **CAPITALES**, `letter-spacing 0.16-0.24em`, 600.
- Échelle : titres hero `clamp(72px, 10vw, 144px)` ; corps `16-20px` ; labels `11-13px`.
  *(Note : la fonte exacte des titres du site était sous licence et non identifiée ; Cormorant
  Garamond est le substitut validé. 3 autres options figurent dans la charte si besoin.)*

### Espacement, formes, effets
- Base 4px. Échelle `--space-1..11` (4px → 176px). Conteneur ~1280px, gouttières généreuses.
- **Rayons** : boutons/champs `--radius-xs` = **2px** ; cartes `--radius-lg` = **14px**.
- **Ombres** : `--shadow-sm/md/lg` (chaudes, discrètes) ; `--shadow-gold` = lueur ✦.
- **Motion** : `--ease-out` cubic-bezier(0.22,1,0.36,1) ; durées 140 / 240 / 420 ms ; pas de rebond.
- **Fond signature** : classe `.as-dotgrid` (bone + radial-gradient de points pine 16 %, pas 38px).

---

## 6. Patterns visuels clés à reproduire

- **Header** : logotype « Alcal*Spark* » à gauche, nav en CAPITALES espacées au centre, bouton
  contour « Démarrer un projet » à droite.
- **Ligne eyebrow** : sur-titre CAPITALES à gauche + disciplines mono « Web · Design · Visuels »
  à droite, séparée par un filet 1px.
- **Hero** : grand titre serif (« Votre marque, *magnifiée.* ») + emblème circulaire or contenant
  le monogramme.
- **Boutons** : primaire = aplat `--pine-600` texte bone ; secondaire = contour pine ; or =
  `--gold-metallic`. Tous en CAPITALES, angles 2px.
- **Cartes** : surface blanche, filet `--color-border`, ombre `--shadow-sm`, angles 14px.
- **Sections sombres** (contact/CTA) : fond `--pine-950`, titre bone, accent or `--gold-300`.

---

## 7. Fichiers de ce paquet

```
charte/
  styles.css              ← point d'entrée (lie les tokens)
  tokens/                 ← fonts, colors, typography, spacing, effects
  assets/                 ← monogramme (pine, bone, original)
pages-reference/
  index.html              ← accueil (rendu cible)
  services.html           ← page Services
  portfolio.html          ← page Portfolio (emplacements images à remplir)
  about.html              ← page À propos + contact
```

> Un développeur (ou Claude Code) qui n'était pas dans la conversation doit pouvoir appliquer la
> DA à partir de ce seul README + les fichiers `charte/`. En cas de doute sur un rendu, se référer
> aux pages de `pages-reference/`.
