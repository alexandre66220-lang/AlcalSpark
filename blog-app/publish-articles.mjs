/**
 * Publication de 3 nouveaux articles SEO dans Sanity.
 * Usage : node publish-articles.mjs
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
    // .env.local absent, variables d'environnement existantes utilisees
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

const articles = [
  /* ============================================================
     ARTICLE 1 : Combien coute un site web pour un artisan en Occitanie ?
     ============================================================ */
  {
    _type: "article",
    titre: "Combien coute un site web pour un artisan en Occitanie ?",
    slug: { _type: "slug", current: "combien-coute-site-web-artisan-occitanie" },
    date: "2026-04-10",
    categorie: "Creation web",
    extrait:
      "Fourchettes de prix reelles, difference entre template et sur-mesure : tout ce qu'un artisan doit savoir avant de creer son site en Occitanie.",
    contenu: [
      b("a1-intro", "normal",
        "Quand un artisan cherche a creer son site web, la premiere question est presque toujours la meme : combien ca coute ? C'est une question legitime, et pourtant tres peu d'agences y repondent clairement. Cet article presente les fourchettes reelles du marche en 2026, les differences entre les solutions disponibles, et ce qui justifie les ecarts de prix. Sans langue de bois."),

      b("a1-h2-1", "h2", "Les grandes fourchettes de prix du marche"),
      b("a1-p1", "normal",
        "Le marche de la creation de site web est tres segmente. Pour un artisan ou une petite entreprise en Occitanie, voici les quatre grandes categories de solutions et leurs fourchettes de prix en 2026."),

      b("a1-h3-1", "h3", "Les outils en libre-service : Wix, Squarespace, Jimdo"),
      b("a1-p2", "normal",
        "Ces plateformes permettent de creer un site soi-meme sans competences techniques. Le tarif varie de 0 a 30 euros par mois selon les formules. L'avantage principal est le prix. Les inconvenients sont nombreux : design generique difficile a personnaliser, performances limitees, peu de controle sur le referencement naturel, et dependance totale a la plateforme. Si elle ferme ou change ses conditions, votre site peut disparaitre du jour au lendemain. Pour un artisan qui souhaite se demarquer de ses concurrents, ces outils sont rarement suffisants."),

      b("a1-h3-2", "h3", "Les sites WordPress avec theme premium"),
      b("a1-p3", "normal",
        "WordPress reste la solution la plus repandue. Avec un theme achete entre 50 et 200 euros et quelques plugins, on peut creer un site presentable pour 800 a 2 500 euros si vous faites appel a un freelance ou une agence peu chere. Le probleme : un site WordPress necessite des mises a jour regulieres, des sauvegardes, une surveillance de la securite. Sans maintenance serieuse, il devient rapidement vulnerable aux pirates informatiques et son chargement ralentit au fil du temps. Le cout reel depasse souvent les 300 a 600 euros par an de maintenance non prevue."),

      b("a1-h3-3", "h3", "Les sites developpes par un freelance"),
      b("a1-p4", "normal",
        "Un developpeur independant peut proposer des tarifs entre 1 000 et 4 000 euros pour un site vitrine. La qualite varie considerablement selon l'experience et la specialisation. L'avantage est souvent une relation plus directe et un prix plus bas qu'une agence. Le risque : un freelance est une seule personne. S'il change de carriere, tombe malade ou devient indisponible, le suivi de votre site peut s'interrompre sans preavis."),

      b("a1-h3-4", "h3", "Les sites sur mesure par une agence specialisee"),
      b("a1-p5", "normal",
        "Pour un site vitrine professionnel developpe sur des technologies modernes (Next.js, Astro, ou autre), les tarifs varient generalement entre 2 000 et 8 000 euros. Pour un site e-commerce avec gestion de catalogue, les fourchettes debutent autour de 4 000 euros et peuvent depasser 15 000 euros pour des projets complexes. Ces ecarts refletent le temps passe, l'expertise engagee, et la qualite du resultat livre."),

      b("a1-h2-2", "h2", "La difference reelle entre un template et un site sur mesure"),
      b("a1-h3-5", "h3", "Ce qu'un template vous coute vraiment"),
      b("a1-p6", "normal",
        "Un template, c'est un moule prefabrique. Des milliers de sites dans le monde l'utilisent. Google le sait, les visiteurs le sentent. Un site base sur un theme WordPress achete en ligne est souvent reconnaissable au premier coup d'oeil : memes blocs, meme mise en page, memes icones. Pour un artisan qui veut construire une image de marque forte et se differencier localement, c'est un frein. De plus, les themes contiennent souvent des dizaines de fonctionnalites inutiles qui alourdissent le code et ralentissent le chargement."),

      b("a1-h3-6", "h3", "Ce que le sur-mesure apporte concretement"),
      b("a1-p7", "normal",
        "Un site developpe sur mesure est concu pour vous et pour vous seul. Le code est propre, optimise, sans fonctionnalites superflues. Le resultat est mesurable : un site sur mesure charge en moins d'une seconde la ou un site WordPress standard peut mettre 3 a 5 secondes. Or, 53 % des internautes quittent un site qui met plus de 3 secondes a charger selon les donnees Google. Un site rapide, c'est plus de visiteurs qui restent, plus de formulaires remplis, plus de clients."),

      b("a1-h2-3", "h2", "Ce qui justifie un prix premium"),
      b("a1-p8", "normal",
        "Un site web est un outil commercial, pas une depense. Ce qui justifie un investissement plus eleve, c'est la valeur generee en retour. Voici les elements concrets qui differencient un site a 5 000 euros d'un site a 500 euros."),

      b("a1-p9", "normal",
        "Le premier element est le travail de strategie en amont. Un bon prestataire ne commence pas a coder immediatement. Il analyse votre metier, vos concurrents locaux, les mots-cles que vos futurs clients tapent dans Google, et construit une architecture de site pensee pour le referencement des le depart. Ce travail preparatoire peut representer 20 a 30 % du budget total."),

      b("a1-p10", "normal",
        "Le deuxieme element est le design sur mesure. Un graphiste ou un directeur artistique cree une identite visuelle coherente avec votre activite et votre positionnement. Les couleurs, la typographie, les images, tout est choisi pour inspirer confiance a vos clients cibles. Un plombier haut de gamme a Montpellier n'a pas le meme site qu'un macon artisan a Castres, et c'est exactement ce que le sur-mesure permet."),

      b("a1-p11", "normal",
        "Le troisieme element est le referencement naturel integre. Un site bien construit inclut des le depart les balises SEO, les donnees structurees, les temps de chargement optimises, et une structure de contenu pensee pour Google. C'est la difference entre un site qui genere du trafic organique et un site que personne ne trouve."),

      b("a1-p12", "normal",
        "Le quatrieme element est le suivi apres livraison. Une agence serieuse n'abandonne pas le client apres avoir livre le projet. Elle assure la maintenance technique, repond aux questions, met a jour le contenu si necessaire, et accompagne dans la duree."),

      b("a1-h2-4", "h2", "Quelle solution choisir pour votre situation ?"),
      b("a1-p13", "normal",
        "Pour un artisan qui demarre et dispose d'un budget limite, une solution Wix ou un site WordPress simple peut etre un premier pas pour avoir une presence en ligne rapidement. Mais des que vous cherchez a generer des clients via Google, a vous demarquer de la concurrence locale, ou a presenter une image professionnelle coherente, investir dans un site sur mesure devient rentable."),

      b("a1-p14", "normal",
        "La bonne question n'est pas : 'Combien coute mon site ?' Elle est : 'Combien me coute l'absence d'un bon site ?' Un client perdu parce que votre site etait trop lent ou peu rassurant, c'est souvent bien plus que le cout d'un site de qualite."),

      b("a1-cta", "normal",
        "Vous avez un projet de site web en Occitanie et vous souhaitez avoir une estimation personnalisee ? L'equipe AlcalSpark vous accompagne de la strategie a la mise en ligne. Discutons de votre projet sur alcalspark.com/contact."),
    ],
  },

  /* ============================================================
     ARTICLE 2 : 5 signes que votre site web fait fuir vos clients
     ============================================================ */
  {
    _type: "article",
    titre: "5 signes que votre site web fait fuir vos clients",
    slug: { _type: "slug", current: "5-signes-site-web-fait-fuir-clients" },
    date: "2026-05-05",
    categorie: "Strategie digitale",
    extrait:
      "Chargement lent, design date, pas responsive... Ces 5 signaux revelent si votre site web nuit a votre activite plutot que de la developper.",
    contenu: [
      b("a2-intro", "normal",
        "Votre site web existe depuis quelques annees, mais vous avez l'impression que ca ne genere pas vraiment de clients. Les formulaires de contact restent silencieux. Pourtant, vous avez des clients satisfaits et de bons avis sur Google. Le probleme vient peut-etre de votre site lui-meme. Voici 5 signaux concrets qui indiquent que votre site fait fuir vos visiteurs avant meme qu'ils aient eu le temps de vous faire confiance."),

      b("a2-h2-1", "h2", "Signe 1 : votre site met plus de 3 secondes a charger"),
      b("a2-p1", "normal",
        "La vitesse de chargement est le premier critere d'abandon. Selon Google, 53 % des visites sur mobile sont abandonnees si une page met plus de 3 secondes a s'afficher. Chaque seconde supplementaire reduit le taux de conversion d'environ 7 %. C'est considerable pour un artisan ou un commerce local."),

      b("a2-p2", "normal",
        "Comment verifier ? Tapez l'adresse de votre site sur PageSpeed Insights, un outil gratuit de Google, et regardez votre score. En dessous de 50 sur mobile, votre site souffre de problemes de performance serieux. Les causes les plus frequentes sont les images trop lourdes, les plugins WordPress inutilises qui se chargent en arriere-plan, et un hebergement de mauvaise qualite."),

      b("a2-p3", "normal",
        "Un site rapide n'est pas un luxe, c'est une necessite. Et cela impacte aussi votre referencement : Google penalise les sites lents dans ses resultats de recherche. Une amelioration de la vitesse est souvent l'un des investissements avec le meilleur retour a court terme."),

      b("a2-h2-2", "h2", "Signe 2 : le design de votre site n'a pas evolue depuis 3 ans ou plus"),
      b("a2-p4", "normal",
        "Le web evolue vite. Un site qui avait l'air moderne en 2021 peut aujourd'hui sembler date, voire amateuriste. Les signaux d'un design vieillissant sont reconnaissables : sliders d'images en haut de page, une pratique abandonnee car inefficace, textes ecrits en police trop petite pour etre lus confortablement, couleurs criantes ou palette incoherente, et surtout une mise en page qui n'inspire pas confiance."),

      b("a2-p5", "normal",
        "La confiance visuelle est determinante. Une etude de l'Universite de Stanford montre que 75 % des internautes jugent la credibilite d'une entreprise sur l'apparence de son site web. Si votre site ressemble a ceux de vos concurrents ou parait moins professionnel, vos visiteurs partent chez eux sans vous avoir contacte."),

      b("a2-p6", "normal",
        "Un design moderne ne signifie pas forcement tout refaire. Parfois, retravailler les couleurs, la typographie et la mise en page des blocs cles suffit a donner un second souffle a un site existant. Un audit visuel rapide permet de determiner si une refonte complete est necessaire ou si des ajustements suffisent."),

      b("a2-h2-3", "h2", "Signe 3 : votre site n'est pas adapte aux telephones mobiles"),
      b("a2-p7", "normal",
        "En 2026, plus de 65 % du trafic web mondial provient des smartphones. Pour les recherches locales, comme 'plombier Albi' ou 'boulangerie Castres', ce chiffre depasse souvent 80 %. Si votre site n'est pas responsive, c'est-a-dire s'il ne s'adapte pas automatiquement a la taille de l'ecran, vos visiteurs mobiles vivent une experience desastreuse : textes trop petits, boutons impossibles a cliquer, images qui debordent de la page."),

      b("a2-p8", "normal",
        "Le test est simple : ouvrez votre site depuis votre propre telephone. Naviguez comme un client lambda. Est-ce que le menu est facilement accessible ? Les textes sont lisibles sans zoomer ? Le formulaire de contact est utilisable avec les doigts ? Si vous repondez non a l'une de ces questions, vous perdez des clients chaque jour."),

      b("a2-p9", "normal",
        "Google applique depuis 2020 une indexation 'mobile first' : c'est la version mobile de votre site qu'il analyse en priorite pour decider de votre positionnement dans les resultats. Un site non responsive est donc doublement penalise : mauvaise experience utilisateur et moins bonne visibilite sur Google."),

      b("a2-h2-4", "h2", "Signe 4 : aucun appel a l'action clair sur vos pages"),
      b("a2-p10", "normal",
        "Un visiteur arrive sur votre site. Il regarde votre page d'accueil. Et puis quoi ? Si la reponse est 'il ne sait pas vraiment quoi faire', c'est que votre site manque d'appels a l'action clairs, appeles CTA en anglais pour call-to-action."),

      b("a2-p11", "normal",
        "Un bon CTA, c'est un bouton ou un lien visible et incitatif qui guide votre visiteur vers l'action que vous souhaitez : demander un devis, appeler, prendre rendez-vous, telecharger une brochure. Ce bouton doit etre visible des les premieres secondes, sans avoir a faire defiler la page."),

      b("a2-p12", "normal",
        "Les erreurs classiques : un formulaire de contact cache dans le menu, un numero de telephone affiche en tout petit dans le bas de page, ou un bouton de meme couleur que le fond de la page. Le visiteur ne cherchera pas longtemps. S'il ne trouve pas comment vous contacter en moins de 5 secondes, il part vers un concurrent dont le site est plus clair."),

      b("a2-h2-5", "h2", "Signe 5 : vous n'apparaissez pas dans les recherches locales"),
      b("a2-p13", "normal",
        "Faites le test maintenant : ouvrez Google en navigation privee et tapez votre metier suivi de votre ville. Par exemple 'electricien Mazamet', 'coiffeur Albi' ou 'menuisier Castres'. Etes-vous visible dans les resultats ? Apparaissez-vous sur la carte Google Maps qui s'affiche souvent en haut des resultats pour les recherches locales ?"),

      b("a2-p14", "normal",
        "Si vous n'apparaissez pas dans les 5 premiers resultats, vos clients potentiels ne vous trouvent tout simplement pas. Le referencement local repose sur plusieurs elements : une fiche Google Business Profile complete et active, des mots-cles locaux integres dans les titres et les textes de votre site, des donnees structurees qui indiquent a Google votre adresse et votre secteur d'activite, et des avis clients reguliers et recents."),

      b("a2-p15", "normal",
        "Ce n'est pas une fatalite. Avec les bons ajustements techniques et editoriaux, un site peut progresser significativement dans les resultats locaux en quelques semaines a quelques mois, meme face a des concurrents etablis depuis longtemps."),

      b("a2-h2-6", "h2", "Que faire si vous vous reconnaissez dans ces signes ?"),
      b("a2-p16", "normal",
        "Inutile de paniquer si votre site cumule plusieurs de ces signaux. Il est tres courant pour une entreprise locale de gerer son coeur de metier sans avoir le temps de surveiller la performance de son site. L'important est d'agir avant que la situation se degrade davantage et que vos concurrents prennent une avance difficile a combler."),

      b("a2-p17", "normal",
        "Parfois, quelques ajustements suffisent : optimiser les images, retravailler les CTA, completer la fiche Google Business Profile. Dans d'autres cas, une refonte complete est necessaire, notamment si le site a plus de 5 ans ou s'il est base sur une technologie obsolete qui limite toute amelioration."),

      b("a2-cta", "normal",
        "Vous souhaitez un diagnostic honnete de votre site actuel ? L'equipe AlcalSpark analyse votre situation et vous propose des recommandations concretes, sans jargon. Contactez-nous sur alcalspark.com/contact."),
    ],
  },

  /* ============================================================
     ARTICLE 3 : SEO local - comment apparaitre en premier sur Google
     ============================================================ */
  {
    _type: "article",
    titre: "SEO local : comment apparaitre en premier sur Google quand vos clients vous cherchent pres de chez eux",
    slug: { _type: "slug", current: "seo-local-apparaitre-premier-google-clients-pres-de-chez-vous" },
    date: "2026-06-05",
    categorie: "SEO & Referencement",
    extrait:
      "SEO local, Google Business Profile, avis clients, coherence NAP : le guide simple pour que vos clients vous trouvent en premier sur Google.",
    contenu: [
      b("a3-intro", "normal",
        "Quand un habitant de votre ville cherche un plombier, un coiffeur ou un cabinet comptable, il tape quelques mots dans Google et appelle l'un des 3 premiers resultats affiches. Si votre entreprise n'est pas visible a ce moment precis, le client appelle votre concurrent. Le SEO local est la discipline qui vous permet de changer ca, et il est beaucoup plus accessible qu'on ne le croit."),

      b("a3-h2-1", "h2", "C'est quoi exactement le SEO local ?"),
      b("a3-p1", "normal",
        "SEO est l'acronyme de Search Engine Optimization, c'est-a-dire l'optimisation pour les moteurs de recherche. Le SEO local est la variante qui cible les recherches geographiques : les internautes qui cherchent un service ou un produit dans une zone precise, souvent accompagne d'un nom de ville ou de la mention 'pres de chez moi'."),

      b("a3-p2", "normal",
        "Contrairement au SEO classique qui vise a bien se positionner sur des mots-cles tres concurrentiels au niveau national, le SEO local se concentre sur une zone geographique definie. Pour un electricien a Albi, l'objectif n'est pas d'apparaitre en tete quand quelqu'un cherche 'electricien' en France, mais bien quand quelqu'un a Albi et dans ses environs cherche 'electricien Albi' ou 'electricien urgence 81'."),

      b("a3-p3", "normal",
        "Le SEO local repose sur trois piliers principaux : votre fiche Google Business Profile, les mentions de votre entreprise sur le web avec des informations coherentes, et le contenu de votre site web avec des references geographiques precises."),

      b("a3-h2-2", "h2", "Google Business Profile explique simplement"),
      b("a3-p4", "normal",
        "Google Business Profile, souvent abrege GBP et anciennement connu sous le nom de Google My Business, est la fiche d'identite de votre entreprise sur Google. C'est elle qui apparait dans le panneau de droite quand quelqu'un cherche votre nom, et surtout dans le 'Local Pack', le bloc avec la carte et les 3 entreprises qui s'affiche en haut des resultats pour les recherches locales."),

      b("a3-p5", "normal",
        "Si vous n'avez pas encore de fiche Google Business Profile, creez-la gratuitement sur business.google.com. Si vous en avez une mais qu'elle est incomplete ou non geree activement, c'est la premiere chose a corriger. Une fiche incomplete envoie un signal negatif a Google et reduit vos chances d'apparaitre dans le Local Pack."),

      b("a3-h3-1", "h3", "Les elements essentiels a remplir sur votre fiche"),
      b("a3-p6", "normal",
        "Le nom de votre entreprise doit correspondre exactement a ce qui apparait sur votre site et sur vos autres supports. Toute incoherence peut nuire a votre referencement. L'adresse doit etre precise, avec le code postal et la ville. Si vous intervenez a domicile sans accueillir de clients dans vos locaux, vous pouvez choisir d'afficher uniquement votre zone d'intervention."),

      b("a3-p7", "normal",
        "Le numero de telephone doit etre identique a celui affiche sur votre site. Les horaires d'ouverture doivent etre a jour, y compris les jours feries. La categorie principale de votre activite doit etre la plus precise possible : 'Plombier', 'Electricien', 'Boulangerie', plutot que 'Entreprise de services'."),

      b("a3-p8", "normal",
        "La description de votre fiche est un champ souvent neglige mais precieux : redigez 200 a 250 mots environ en integrant naturellement votre metier, votre zone geographique, et ce qui vous distingue. Evitez le remplissage artificiel de mots-cles, Google le detecte et peut penaliser votre fiche."),

      b("a3-p9", "normal",
        "Enfin, les photos : une fiche avec des photos de qualite obtient 42 % de demandes d'itineraire en plus selon les statistiques Google. Ajoutez des photos de votre local, de vos realisations, de votre equipe si vous en avez une. Mettez-les a jour regulierement pour signaler a Google que votre fiche est active."),

      b("a3-h2-3", "h2", "L'importance des avis clients dans le referencement local"),
      b("a3-p10", "normal",
        "Les avis Google sont l'un des facteurs les plus puissants du referencement local. Google considere que plus votre fiche a d'avis recents, nombreux et positifs, plus elle merite d'etre affichee en tete des resultats. La note moyenne compte, mais la regularite des avis compte encore plus : 5 avis recus cette semaine valent plus qu'une vingtaine d'avis recus il y a 3 ans."),

      b("a3-p11", "normal",
        "Comment obtenir des avis sans paraitre insistant ? La methode la plus simple est de demander directement a vos clients satisfaits, a la fin d'une prestation ou d'une commande. Un message court par SMS ou par email avec le lien direct vers votre fiche Google suffit dans la plupart des cas. Vous pouvez generer ce lien depuis votre tableau de bord Google Business Profile."),

      b("a3-p12", "normal",
        "La reponse aux avis est aussi importante que les avis eux-memes. Repondre a tous vos avis, qu'ils soient positifs ou negatifs, montre a Google et a vos futurs clients que vous etes actif et engage. Face a un avis negatif, repondez avec calme et professionnalisme. Cela rassure souvent bien plus les lecteurs que la note elle-meme."),

      b("a3-h2-4", "h2", "La coherence NAP : Nom, Adresse, Telephone"),
      b("a3-p13", "normal",
        "NAP est l'acronyme anglais de Name (nom), Address (adresse), Phone (telephone). La coherence NAP signifie que ces trois informations doivent etre exactement identiques partout ou votre entreprise est mentionnee sur internet : votre site, Google Business Profile, les annuaires locaux comme les Pages Jaunes ou Yelp, les reseaux sociaux, les sites d'avis professionnels."),

      b("a3-p14", "normal",
        "Pourquoi c'est si important ? Google utilise ces mentions pour verifier l'existence et la fiabilite de votre entreprise. Si votre adresse est ecrite differemment a plusieurs endroits, avec ou sans le numero de rue, avec des abreviations differentes, Google perd confiance dans vos informations et vous penalise dans les resultats locaux."),

      b("a3-h3-2", "h3", "Comment verifier votre coherence NAP"),
      b("a3-p15", "normal",
        "Commencez par faire un inventaire rapide : cherchez le nom de votre entreprise sur Google et notez toutes les mentions que vous trouvez. Comparez les informations affichees avec ce qui est sur votre site. Corrigez toute incoherence en vous connectant directement sur chaque plateforme. Cette demarche prend rarement plus d'une heure et peut avoir un impact significatif sur votre positionnement local."),

      b("a3-p16", "normal",
        "Si votre numero de telephone a change recemment, ou si vous avez demenage, cette correction est prioritaire. Un client qui appelle un numero perime parce qu'il l'a trouve sur un ancien annuaire en ligne, c'est un client perdu et potentiellement une mauvaise image renvoyee."),

      b("a3-h2-5", "h2", "Le contenu de votre site, un levier sous-estime"),
      b("a3-p17", "normal",
        "Au-dela de la fiche Google et des avis, le contenu de votre site web joue un role determinant dans votre referencement local. Google analyse les textes de vos pages pour comprendre ou vous exercez et ce que vous faites. Si votre site ne mentionne pas votre ville et votre departement, Google ne peut pas savoir que vous etes l'entreprise locale que ses utilisateurs cherchent."),

      b("a3-p18", "normal",
        "Integrez naturellement le nom de votre ville, departement ou region dans le titre principal de votre page d'accueil, dans la meta-description visible dans Google, dans les titres de vos sections, et dans les textes de presentation. L'exemple de deux plombiers a competences egales : celui qui mentionne 'plombier a Castres, Tarn' dans son contenu sera mieux positionne que celui dont le site ne mentionne aucun lieu."),

      b("a3-p19", "normal",
        "Les donnees structurees au format JSON-LD sont une couche technique supplementaire qui permet d'indiquer clairement a Google votre type d'activite, votre adresse, vos horaires et votre zone de service. Un developpeur experimente peut les integrer en quelques heures sur votre site existant, et l'impact sur le referencement local peut etre significatif."),

      b("a3-h2-6", "h2", "Par ou commencer si vous partez de zero ?"),
      b("a3-p20", "normal",
        "Si vous demarrez le SEO local sans avoir rien mis en place jusqu'ici, voici l'ordre de priorite recommande. Premierement, creez ou reclamez et completez a 100 % votre fiche Google Business Profile. C'est gratuit, rapide, et l'impact est souvent visible en 2 a 4 semaines. Deuxiemement, demandez a vos 5 meilleurs clients de vous laisser un avis Google. Troisiemement, verifiez que votre site mentionne votre ville et votre activite dans les titres principaux. Quatriemement, assurez la coherence de votre NAP sur les principaux annuaires."),

      b("a3-p21", "normal",
        "Les premiers resultats du SEO local sont souvent plus rapides que le SEO classique. Sur des marches locaux en Occitanie, des ameliorations significatives de visibilite peuvent etre observees en 1 a 3 mois lorsque les fondations sont bien posees et que les actions sont maintenues dans la duree."),

      b("a3-cta", "normal",
        "Vous souhaitez ameliorer votre visibilite locale en Occitanie et attirer plus de clients depuis Google ? AlcalSpark accompagne artisans et PME avec des strategies SEO local adaptees a leur secteur et leur zone geographique. Parlons de votre situation sur alcalspark.com/contact."),
    ],
  },
];

async function publish() {
  console.log("Publication de", articles.length, "articles dans Sanity...");
  for (const article of articles) {
    const existing = await client.fetch(
      `*[_type == "article" && slug.current == $slug][0]._id`,
      { slug: article.slug.current }
    );
    if (existing) {
      console.log(`Article deja present, ignore : ${article.slug.current}`);
      continue;
    }
    const created = await client.create(article);
    console.log(`Article cree : ${created._id} — ${article.titre}`);
  }
  console.log("Publication terminee.");
}

publish().catch((err) => {
  console.error(err);
  process.exit(1);
});
