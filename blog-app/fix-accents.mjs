/**
 * Correction des accents sur les 3 articles publiés dans Sanity.
 * Usage : node fix-accents.mjs
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, ".env.local"), "utf-8");
    raw.split("\n").forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
  } catch {
    // .env.local absent
  }
}

loadEnv();

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

function b(key, style, text) {
  return {
    _type: "block",
    _key: key,
    style,
    children: [{ _type: "span", _key: key + "-s", text }],
    markDefs: [],
  };
}

const corrections = [
  {
    slug: "combien-coute-site-web-artisan-occitanie",
    titre: "Combien coûte un site web pour un artisan en Occitanie ?",
    extrait:
      "Fourchettes de prix réelles, différence entre template et sur-mesure : tout ce qu'un artisan doit savoir avant de créer son site en Occitanie.",
    contenu: [
      b("a1-intro", "normal",
        "Quand un artisan cherche à créer son site web, la première question est presque toujours la même : combien ça coûte ? C'est une question légitime, et pourtant très peu d'agences y répondent clairement. Cet article présente les fourchettes réelles du marché en 2026, les différences entre les solutions disponibles, et ce qui justifie les écarts de prix. Sans langue de bois."),

      b("a1-h2-1", "h2", "Les grandes fourchettes de prix du marché"),
      b("a1-p1", "normal",
        "Le marché de la création de site web est très segmenté. Pour un artisan ou une petite entreprise en Occitanie, voici les quatre grandes catégories de solutions et leurs fourchettes de prix en 2026."),

      b("a1-h3-1", "h3", "Les outils en libre-service : Wix, Squarespace, Jimdo"),
      b("a1-p2", "normal",
        "Ces plateformes permettent de créer un site soi-même sans compétences techniques. Le tarif varie de 0 à 30 euros par mois selon les formules. L'avantage principal est le prix. Les inconvénients sont nombreux : design générique difficile à personnaliser, performances limitées, peu de contrôle sur le référencement naturel, et dépendance totale à la plateforme. Si elle ferme ou change ses conditions, votre site peut disparaître du jour au lendemain. Pour un artisan qui souhaite se démarquer de ses concurrents, ces outils sont rarement suffisants."),

      b("a1-h3-2", "h3", "Les sites WordPress avec thème premium"),
      b("a1-p3", "normal",
        "WordPress reste la solution la plus répandue. Avec un thème acheté entre 50 et 200 euros et quelques plugins, on peut créer un site présentable pour 800 à 2 500 euros si vous faites appel à un freelance ou une agence peu chère. Le problème : un site WordPress nécessite des mises à jour régulières, des sauvegardes, une surveillance de la sécurité. Sans maintenance sérieuse, il devient rapidement vulnérable aux pirates informatiques et son chargement ralentit au fil du temps. Le coût réel dépasse souvent les 300 à 600 euros par an de maintenance non prévue."),

      b("a1-h3-3", "h3", "Les sites développés par un freelance"),
      b("a1-p4", "normal",
        "Un développeur indépendant peut proposer des tarifs entre 1 000 et 4 000 euros pour un site vitrine. La qualité varie considérablement selon l'expérience et la spécialisation. L'avantage est souvent une relation plus directe et un prix plus bas qu'une agence. Le risque : un freelance est une seule personne. S'il change de carrière, tombe malade ou devient indisponible, le suivi de votre site peut s'interrompre sans préavis."),

      b("a1-h3-4", "h3", "Les sites sur mesure par une agence spécialisée"),
      b("a1-p5", "normal",
        "Pour un site vitrine professionnel développé sur des technologies modernes (Next.js, Astro, ou autre), les tarifs varient généralement entre 2 000 et 8 000 euros. Pour un site e-commerce avec gestion de catalogue, les fourchettes débutent autour de 4 000 euros et peuvent dépasser 15 000 euros pour des projets complexes. Ces écarts reflètent le temps passé, l'expertise engagée, et la qualité du résultat livré."),

      b("a1-h2-2", "h2", "La différence réelle entre un template et un site sur mesure"),
      b("a1-h3-5", "h3", "Ce qu'un template vous coûte vraiment"),
      b("a1-p6", "normal",
        "Un template, c'est un moule préfabriqué. Des milliers de sites dans le monde l'utilisent. Google le sait, les visiteurs le sentent. Un site basé sur un thème WordPress acheté en ligne est souvent reconnaissable au premier coup d'oeil : mêmes blocs, même mise en page, mêmes icônes. Pour un artisan qui veut construire une image de marque forte et se différencier localement, c'est un frein. De plus, les thèmes contiennent souvent des dizaines de fonctionnalités inutiles qui alourdissent le code et ralentissent le chargement."),

      b("a1-h3-6", "h3", "Ce que le sur-mesure apporte concrètement"),
      b("a1-p7", "normal",
        "Un site développé sur mesure est conçu pour vous et pour vous seul. Le code est propre, optimisé, sans fonctionnalités superflues. Le résultat est mesurable : un site sur mesure charge en moins d'une seconde là où un site WordPress standard peut mettre 3 à 5 secondes. Or, 53 % des internautes quittent un site qui met plus de 3 secondes à charger selon les données Google. Un site rapide, c'est plus de visiteurs qui restent, plus de formulaires remplis, plus de clients."),

      b("a1-h2-3", "h2", "Ce qui justifie un prix premium"),
      b("a1-p8", "normal",
        "Un site web est un outil commercial, pas une dépense. Ce qui justifie un investissement plus élevé, c'est la valeur générée en retour. Voici les éléments concrets qui différencient un site à 5 000 euros d'un site à 500 euros."),
      b("a1-p9", "normal",
        "Le premier élément est le travail de stratégie en amont. Un bon prestataire ne commence pas à coder immédiatement. Il analyse votre métier, vos concurrents locaux, les mots-clés que vos futurs clients tapent dans Google, et construit une architecture de site pensée pour le référencement dès le départ. Ce travail préparatoire peut représenter 20 à 30 % du budget total."),
      b("a1-p10", "normal",
        "Le deuxième élément est le design sur mesure. Un graphiste ou un directeur artistique crée une identité visuelle cohérente avec votre activité et votre positionnement. Les couleurs, la typographie, les images, tout est choisi pour inspirer confiance à vos clients cibles. Un plombier haut de gamme à Montpellier n'a pas le même site qu'un maçon artisan à Castres, et c'est exactement ce que le sur-mesure permet."),
      b("a1-p11", "normal",
        "Le troisième élément est le référencement naturel intégré. Un site bien construit inclut dès le départ les balises SEO, les données structurées, les temps de chargement optimisés, et une structure de contenu pensée pour Google. C'est la différence entre un site qui génère du trafic organique et un site que personne ne trouve."),
      b("a1-p12", "normal",
        "Le quatrième élément est le suivi après livraison. Une agence sérieuse n'abandonne pas le client après avoir livré le projet. Elle assure la maintenance technique, répond aux questions, met à jour le contenu si nécessaire, et accompagne dans la durée."),

      b("a1-h2-4", "h2", "Quelle solution choisir pour votre situation ?"),
      b("a1-p13", "normal",
        "Pour un artisan qui démarre et dispose d'un budget limité, une solution Wix ou un site WordPress simple peut être un premier pas pour avoir une présence en ligne rapidement. Mais dès que vous cherchez à générer des clients via Google, à vous démarquer de la concurrence locale, ou à présenter une image professionnelle cohérente, investir dans un site sur mesure devient rentable."),
      b("a1-p14", "normal",
        "La bonne question n'est pas : 'Combien coûte mon site ?' Elle est : 'Combien me coûte l'absence d'un bon site ?' Un client perdu parce que votre site était trop lent ou peu rassurant, c'est souvent bien plus que le coût d'un site de qualité."),
      b("a1-cta", "normal",
        "Vous avez un projet de site web en Occitanie et vous souhaitez avoir une estimation personnalisée ? L'équipe AlcalSpark vous accompagne de la stratégie à la mise en ligne. Discutons de votre projet sur alcalspark.com/contact."),
    ],
  },
  {
    slug: "5-signes-site-web-fait-fuir-clients",
    titre: "5 signes que votre site web fait fuir vos clients",
    extrait:
      "Chargement lent, design daté, pas responsive... Ces 5 signaux révèlent si votre site web nuit à votre activité plutôt que de la développer.",
    contenu: [
      b("a2-intro", "normal",
        "Votre site web existe depuis quelques années, mais vous avez l'impression que ça ne génère pas vraiment de clients. Les formulaires de contact restent silencieux. Pourtant, vous avez des clients satisfaits et de bons avis sur Google. Le problème vient peut-être de votre site lui-même. Voici 5 signaux concrets qui indiquent que votre site fait fuir vos visiteurs avant même qu'ils aient eu le temps de vous faire confiance."),

      b("a2-h2-1", "h2", "Signe 1 : votre site met plus de 3 secondes à charger"),
      b("a2-p1", "normal",
        "La vitesse de chargement est le premier critère d'abandon. Selon Google, 53 % des visites sur mobile sont abandonnées si une page met plus de 3 secondes à s'afficher. Chaque seconde supplémentaire réduit le taux de conversion d'environ 7 %. C'est considérable pour un artisan ou un commerce local."),
      b("a2-p2", "normal",
        "Comment vérifier ? Tapez l'adresse de votre site sur PageSpeed Insights, un outil gratuit de Google, et regardez votre score. En dessous de 50 sur mobile, votre site souffre de problèmes de performance sérieux. Les causes les plus fréquentes sont les images trop lourdes, les plugins WordPress inutilisés qui se chargent en arrière-plan, et un hébergement de mauvaise qualité."),
      b("a2-p3", "normal",
        "Un site rapide n'est pas un luxe, c'est une nécessité. Et cela impacte aussi votre référencement : Google pénalise les sites lents dans ses résultats de recherche. Une amélioration de la vitesse est souvent l'un des investissements avec le meilleur retour à court terme."),

      b("a2-h2-2", "h2", "Signe 2 : le design de votre site n'a pas évolué depuis 3 ans ou plus"),
      b("a2-p4", "normal",
        "Le web évolue vite. Un site qui avait l'air moderne en 2021 peut aujourd'hui sembler daté, voire amateuriste. Les signaux d'un design vieillissant sont reconnaissables : sliders d'images en haut de page, une pratique abandonnée car inefficace, textes écrits en police trop petite pour être lus confortablement, couleurs criantes ou palette incohérente, et surtout une mise en page qui n'inspire pas confiance."),
      b("a2-p5", "normal",
        "La confiance visuelle est déterminante. Une étude de l'Université de Stanford montre que 75 % des internautes jugent la crédibilité d'une entreprise sur l'apparence de son site web. Si votre site ressemble à ceux de vos concurrents ou paraît moins professionnel, vos visiteurs partent chez eux sans vous avoir contacté."),
      b("a2-p6", "normal",
        "Un design moderne ne signifie pas forcément tout refaire. Parfois, retravailler les couleurs, la typographie et la mise en page des blocs clés suffit à donner un second souffle à un site existant. Un audit visuel rapide permet de déterminer si une refonte complète est nécessaire ou si des ajustements suffisent."),

      b("a2-h2-3", "h2", "Signe 3 : votre site n'est pas adapté aux téléphones mobiles"),
      b("a2-p7", "normal",
        "En 2026, plus de 65 % du trafic web mondial provient des smartphones. Pour les recherches locales, comme 'plombier Albi' ou 'boulangerie Castres', ce chiffre dépasse souvent 80 %. Si votre site n'est pas responsive, c'est-à-dire s'il ne s'adapte pas automatiquement à la taille de l'écran, vos visiteurs mobiles vivent une expérience désastreuse : textes trop petits, boutons impossibles à cliquer, images qui débordent de la page."),
      b("a2-p8", "normal",
        "Le test est simple : ouvrez votre site depuis votre propre téléphone. Naviguez comme un client lambda. Est-ce que le menu est facilement accessible ? Les textes sont lisibles sans zoomer ? Le formulaire de contact est utilisable avec les doigts ? Si vous répondez non à l'une de ces questions, vous perdez des clients chaque jour."),
      b("a2-p9", "normal",
        "Google applique depuis 2020 une indexation 'mobile first' : c'est la version mobile de votre site qu'il analyse en priorité pour décider de votre positionnement dans les résultats. Un site non responsive est donc doublement pénalisé : mauvaise expérience utilisateur et moins bonne visibilité sur Google."),

      b("a2-h2-4", "h2", "Signe 4 : aucun appel à l'action clair sur vos pages"),
      b("a2-p10", "normal",
        "Un visiteur arrive sur votre site. Il regarde votre page d'accueil. Et puis quoi ? Si la réponse est 'il ne sait pas vraiment quoi faire', c'est que votre site manque d'appels à l'action clairs, appelés CTA en anglais pour call-to-action."),
      b("a2-p11", "normal",
        "Un bon CTA, c'est un bouton ou un lien visible et incitatif qui guide votre visiteur vers l'action que vous souhaitez : demander un devis, appeler, prendre rendez-vous, télécharger une brochure. Ce bouton doit être visible dès les premières secondes, sans avoir à faire défiler la page."),
      b("a2-p12", "normal",
        "Les erreurs classiques : un formulaire de contact caché dans le menu, un numéro de téléphone affiché en tout petit dans le bas de page, ou un bouton de même couleur que le fond de la page. Le visiteur ne cherchera pas longtemps. S'il ne trouve pas comment vous contacter en moins de 5 secondes, il part vers un concurrent dont le site est plus clair."),

      b("a2-h2-5", "h2", "Signe 5 : vous n'apparaissez pas dans les recherches locales"),
      b("a2-p13", "normal",
        "Faites le test maintenant : ouvrez Google en navigation privée et tapez votre métier suivi de votre ville. Par exemple 'électricien Mazamet', 'coiffeur Albi' ou 'menuisier Castres'. Êtes-vous visible dans les résultats ? Apparaissez-vous sur la carte Google Maps qui s'affiche souvent en haut des résultats pour les recherches locales ?"),
      b("a2-p14", "normal",
        "Si vous n'apparaissez pas dans les 5 premiers résultats, vos clients potentiels ne vous trouvent tout simplement pas. Le référencement local repose sur plusieurs éléments : une fiche Google Business Profile complète et active, des mots-clés locaux intégrés dans les titres et les textes de votre site, des données structurées qui indiquent à Google votre adresse et votre secteur d'activité, et des avis clients réguliers et récents."),
      b("a2-p15", "normal",
        "Ce n'est pas une fatalité. Avec les bons ajustements techniques et éditoriaux, un site peut progresser significativement dans les résultats locaux en quelques semaines à quelques mois, même face à des concurrents établis depuis longtemps."),

      b("a2-h2-6", "h2", "Que faire si vous vous reconnaissez dans ces signes ?"),
      b("a2-p16", "normal",
        "Inutile de paniquer si votre site cumule plusieurs de ces signaux. Il est très courant pour une entreprise locale de gérer son coeur de métier sans avoir le temps de surveiller la performance de son site. L'important est d'agir avant que la situation se dégrade davantage et que vos concurrents prennent une avance difficile à combler."),
      b("a2-p17", "normal",
        "Parfois, quelques ajustements suffisent : optimiser les images, retravailler les CTA, compléter la fiche Google Business Profile. Dans d'autres cas, une refonte complète est nécessaire, notamment si le site a plus de 5 ans ou s'il est basé sur une technologie obsolète qui limite toute amélioration."),
      b("a2-cta", "normal",
        "Vous souhaitez un diagnostic honnête de votre site actuel ? L'équipe AlcalSpark analyse votre situation et vous propose des recommandations concrètes, sans jargon. Contactez-nous sur alcalspark.com/contact."),
    ],
  },
  {
    slug: "seo-local-apparaitre-premier-google-clients-pres-de-chez-vous",
    titre: "SEO local : comment apparaître en premier sur Google quand vos clients vous cherchent près de chez eux",
    extrait:
      "SEO local, Google Business Profile, avis clients, cohérence NAP : le guide simple pour que vos clients vous trouvent en premier sur Google.",
    contenu: [
      b("a3-intro", "normal",
        "Quand un habitant de votre ville cherche un plombier, un coiffeur ou un cabinet comptable, il tape quelques mots dans Google et appelle l'un des 3 premiers résultats affichés. Si votre entreprise n'est pas visible à ce moment précis, le client appelle votre concurrent. Le SEO local est la discipline qui vous permet de changer ça, et il est beaucoup plus accessible qu'on ne le croit."),

      b("a3-h2-1", "h2", "C'est quoi exactement le SEO local ?"),
      b("a3-p1", "normal",
        "SEO est l'acronyme de Search Engine Optimization, c'est-à-dire l'optimisation pour les moteurs de recherche. Le SEO local est la variante qui cible les recherches géographiques : les internautes qui cherchent un service ou un produit dans une zone précise, souvent accompagné d'un nom de ville ou de la mention 'près de chez moi'."),
      b("a3-p2", "normal",
        "Contrairement au SEO classique qui vise à bien se positionner sur des mots-clés très concurrentiels au niveau national, le SEO local se concentre sur une zone géographique définie. Pour un électricien à Albi, l'objectif n'est pas d'apparaître en tête quand quelqu'un cherche 'électricien' en France, mais bien quand quelqu'un à Albi et dans ses environs cherche 'électricien Albi' ou 'électricien urgence 81'."),
      b("a3-p3", "normal",
        "Le SEO local repose sur trois piliers principaux : votre fiche Google Business Profile, les mentions de votre entreprise sur le web avec des informations cohérentes, et le contenu de votre site web avec des références géographiques précises."),

      b("a3-h2-2", "h2", "Google Business Profile expliqué simplement"),
      b("a3-p4", "normal",
        "Google Business Profile, souvent abrégé GBP et anciennement connu sous le nom de Google My Business, est la fiche d'identité de votre entreprise sur Google. C'est elle qui apparaît dans le panneau de droite quand quelqu'un cherche votre nom, et surtout dans le 'Local Pack', le bloc avec la carte et les 3 entreprises qui s'affiche en haut des résultats pour les recherches locales."),
      b("a3-p5", "normal",
        "Si vous n'avez pas encore de fiche Google Business Profile, créez-la gratuitement sur business.google.com. Si vous en avez une mais qu'elle est incomplète ou non gérée activement, c'est la première chose à corriger. Une fiche incomplète envoie un signal négatif à Google et réduit vos chances d'apparaître dans le Local Pack."),

      b("a3-h3-1", "h3", "Les éléments essentiels à remplir sur votre fiche"),
      b("a3-p6", "normal",
        "Le nom de votre entreprise doit correspondre exactement à ce qui apparaît sur votre site et sur vos autres supports. Toute incohérence peut nuire à votre référencement. L'adresse doit être précise, avec le code postal et la ville. Si vous intervenez à domicile sans accueillir de clients dans vos locaux, vous pouvez choisir d'afficher uniquement votre zone d'intervention."),
      b("a3-p7", "normal",
        "Le numéro de téléphone doit être identique à celui affiché sur votre site. Les horaires d'ouverture doivent être à jour, y compris les jours fériés. La catégorie principale de votre activité doit être la plus précise possible : 'Plombier', 'Électricien', 'Boulangerie', plutôt que 'Entreprise de services'."),
      b("a3-p8", "normal",
        "La description de votre fiche est un champ souvent négligé mais précieux : rédigez 200 à 250 mots environ en intégrant naturellement votre métier, votre zone géographique, et ce qui vous distingue. Évitez le remplissage artificiel de mots-clés, Google le détecte et peut pénaliser votre fiche."),
      b("a3-p9", "normal",
        "Enfin, les photos : une fiche avec des photos de qualité obtient 42 % de demandes d'itinéraire en plus selon les statistiques Google. Ajoutez des photos de votre local, de vos réalisations, de votre équipe si vous en avez une. Mettez-les à jour régulièrement pour signaler à Google que votre fiche est active."),

      b("a3-h2-3", "h2", "L'importance des avis clients dans le référencement local"),
      b("a3-p10", "normal",
        "Les avis Google sont l'un des facteurs les plus puissants du référencement local. Google considère que plus votre fiche a d'avis récents, nombreux et positifs, plus elle mérite d'être affichée en tête des résultats. La note moyenne compte, mais la régularité des avis compte encore plus : 5 avis reçus cette semaine valent plus qu'une vingtaine d'avis reçus il y a 3 ans."),
      b("a3-p11", "normal",
        "Comment obtenir des avis sans paraître insistant ? La méthode la plus simple est de demander directement à vos clients satisfaits, à la fin d'une prestation ou d'une commande. Un message court par SMS ou par email avec le lien direct vers votre fiche Google suffit dans la plupart des cas. Vous pouvez générer ce lien depuis votre tableau de bord Google Business Profile."),
      b("a3-p12", "normal",
        "La réponse aux avis est aussi importante que les avis eux-mêmes. Répondre à tous vos avis, qu'ils soient positifs ou négatifs, montre à Google et à vos futurs clients que vous êtes actif et engagé. Face à un avis négatif, répondez avec calme et professionnalisme. Cela rassure souvent bien plus les lecteurs que la note elle-même."),

      b("a3-h2-4", "h2", "La cohérence NAP : Nom, Adresse, Téléphone"),
      b("a3-p13", "normal",
        "NAP est l'acronyme anglais de Name (nom), Address (adresse), Phone (téléphone). La cohérence NAP signifie que ces trois informations doivent être exactement identiques partout où votre entreprise est mentionnée sur internet : votre site, Google Business Profile, les annuaires locaux comme les Pages Jaunes ou Yelp, les réseaux sociaux, les sites d'avis professionnels."),
      b("a3-p14", "normal",
        "Pourquoi c'est si important ? Google utilise ces mentions pour vérifier l'existence et la fiabilité de votre entreprise. Si votre adresse est écrite différemment à plusieurs endroits, avec ou sans le numéro de rue, avec des abréviations différentes, Google perd confiance dans vos informations et vous pénalise dans les résultats locaux."),

      b("a3-h3-2", "h3", "Comment vérifier votre cohérence NAP"),
      b("a3-p15", "normal",
        "Commencez par faire un inventaire rapide : cherchez le nom de votre entreprise sur Google et notez toutes les mentions que vous trouvez. Comparez les informations affichées avec ce qui est sur votre site. Corrigez toute incohérence en vous connectant directement sur chaque plateforme. Cette démarche prend rarement plus d'une heure et peut avoir un impact significatif sur votre positionnement local."),
      b("a3-p16", "normal",
        "Si votre numéro de téléphone a changé récemment, ou si vous avez déménagé, cette correction est prioritaire. Un client qui appelle un numéro périmé parce qu'il l'a trouvé sur un ancien annuaire en ligne, c'est un client perdu et potentiellement une mauvaise image renvoyée."),

      b("a3-h2-5", "h2", "Le contenu de votre site, un levier sous-estimé"),
      b("a3-p17", "normal",
        "Au-delà de la fiche Google et des avis, le contenu de votre site web joue un rôle déterminant dans votre référencement local. Google analyse les textes de vos pages pour comprendre où vous exercez et ce que vous faites. Si votre site ne mentionne pas votre ville et votre département, Google ne peut pas savoir que vous êtes l'entreprise locale que ses utilisateurs cherchent."),
      b("a3-p18", "normal",
        "Intégrez naturellement le nom de votre ville, département ou région dans le titre principal de votre page d'accueil, dans la méta-description visible dans Google, dans les titres de vos sections, et dans les textes de présentation. L'exemple de deux plombiers à compétences égales : celui qui mentionne 'plombier à Castres, Tarn' dans son contenu sera mieux positionné que celui dont le site ne mentionne aucun lieu."),
      b("a3-p19", "normal",
        "Les données structurées au format JSON-LD sont une couche technique supplémentaire qui permet d'indiquer clairement à Google votre type d'activité, votre adresse, vos horaires et votre zone de service. Un développeur expérimenté peut les intégrer en quelques heures sur votre site existant, et l'impact sur le référencement local peut être significatif."),

      b("a3-h2-6", "h2", "Par où commencer si vous partez de zéro ?"),
      b("a3-p20", "normal",
        "Si vous démarrez le SEO local sans avoir rien mis en place jusqu'ici, voici l'ordre de priorité recommandé. Premièrement, créez ou réclamez et complétez à 100 % votre fiche Google Business Profile. C'est gratuit, rapide, et l'impact est souvent visible en 2 à 4 semaines. Deuxièmement, demandez à vos 5 meilleurs clients de vous laisser un avis Google. Troisièmement, vérifiez que votre site mentionne votre ville et votre activité dans les titres principaux. Quatrièmement, assurez la cohérence de votre NAP sur les principaux annuaires."),
      b("a3-p21", "normal",
        "Les premiers résultats du SEO local sont souvent plus rapides que le SEO classique. Sur des marchés locaux en Occitanie, des améliorations significatives de visibilité peuvent être observées en 1 à 3 mois lorsque les fondations sont bien posées et que les actions sont maintenues dans la durée."),
      b("a3-cta", "normal",
        "Vous souhaitez améliorer votre visibilité locale en Occitanie et attirer plus de clients depuis Google ? AlcalSpark accompagne artisans et PME avec des stratégies SEO local adaptées à leur secteur et leur zone géographique. Parlons de votre situation sur alcalspark.com/contact."),
    ],
  },
];

async function fixAccents() {
  console.log("Correction des accents sur", corrections.length, "articles...");
  for (const fix of corrections) {
    const id = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0]._id`,
      { slug: fix.slug }
    );
    if (!id) {
      console.log(`Article introuvable : ${fix.slug}`);
      continue;
    }
    await client
      .patch(id)
      .set({ titre: fix.titre, extrait: fix.extrait, contenu: fix.contenu })
      .commit();
    console.log(`Corrigé : ${fix.titre}`);
  }
  console.log("Correction terminée.");
}

fixAccents().catch((err) => {
  console.error(err);
  process.exit(1);
});
