/* ---------------------------------------------------------------
   HISTOIRE + ARBRE DE CHOIX
   Tout le texte vit ici. engine.js n'a jamais besoin d'être touché.
   -----------------------------------------------------------------
   Réplique : ["evan" | "lauryne", "texte"]
   Choix    : { label, say, goto, set }
       label → texte du bouton
       say   → ce que Lauryne répond après le clic
       set   → mémorise le choix (lieu, menu, apres…)
   Noeud    :
       bg        décor            weather  particules
       cast      false | {bottom, width}
       teleport  true → Evan sort la montre et les téléporte
       end       true → écran de ticket
   Jetons @lieu @menu @apres remplacés à l'affichage.
--------------------------------------------------------------- */

const HER = "Lauryne";
const HIM = "Evan";

const STORY = {

  /* ================= OUVERTURE ================= */
  start: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Ne pose pas de questions tout de suite.`],
      ["evan", `J'ai trouvé une montre. Elle ne donne pas l'heure.`],
      ["evan", `Elle nous emmène là où tu veux passer la soirée.`],
      ["evan", `Une seule règle : c'est toi qui choisis. Moi je suis.`],
    ],
    choices: [
      { label: "Une montre.", say: `Une montre.`, goto: "carrefour" },
      { label: "Prouve-le.",  say: `Prouve-le.`,  goto: "carrefour" },
    ],
  },

  carrefour: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Deux directions. Aucune mauvaise réponse.`],
      ["evan", `Dans l'une je dois réserver une table. Dans l'autre je dois cuisiner.`],
      ["evan", `Choisis en connaissance de cause.`],
    ],
    choices: [
      { label: "Un restaurant",
        say: `Un restaurant. Nappe, couverts, tout.`, goto: "resto_choix" },
      { label: "Un pique-nique",
        say: `Un pique-nique. Je veux te voir cuisiner.`, goto: "picnic_lieu" },
    ],
  },

  /* ================= BRANCHE RESTAURANT ================= */
  resto_choix: {
    bg: "resto", weather: "warmdust", cast: false, teleport: true,
    lines: [
      ["evan", `Voilà. Une table, deux couverts, une bougie qui tiendra jusqu'au dessert.`],
      ["evan", `Deux adresses. Je peux avoir de la place dans les deux.`],
    ],
    choices: [
      { label: "Au Comptoir Vénitien",
        say: `Le Comptoir Vénitien.`,
        goto: "apres", set: { lieu: "Au Comptoir Vénitien", menu: "Une table pour deux" } },
      { label: "BEY BEEF",
        say: `BEY BEEF. J'ai faim, autant assumer.`,
        goto: "apres", set: { lieu: "BEY BEEF", menu: "Une table pour deux" } },
    ],
  },

  /* ================= BRANCHE PIQUE-NIQUE ================= */
  picnic_lieu: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Un panier, une couverture, et personne autour.`],
      ["evan", `La montre attend. Tu nous emmènes où ?`],
    ],
    choices: [
      { label: "Un parc",  say: `Un parc. Simple, et on rentre à pied.`,
        goto: "picnic_menu", set: { lieu: "Le parc" } },
      { label: "La forêt", say: `La forêt. Loin de tout, tant qu'à faire.`,
        goto: "picnic_menu", set: { lieu: "La forêt" } },
      { label: "La plage", say: `La plage. Je veux le coucher de soleil.`,
        goto: "picnic_menu", set: { lieu: "La plage" } },
    ],
  },

  picnic_menu: {
    bg: "@lieu", weather: "@lieu", teleport: true,
    cast: { bottom: "21%" },
    lines: [
      ["lauryne", `D'accord. Là, d'accord.`],
      ["evan", `Content que ça te plaise, parce que je ne sais pas encore la faire revenir.`],
      ["evan", `Il reste le panier. Il y a quoi dedans ?`],
    ],
    choices: [
      { label: "Le classique",
        say: `Le classique. Pain, fromage, tomates, une bouteille.`,
        goto: "apres", set: { menu: "Pain, fromage, tomates, une bouteille" } },
      { label: "Des sushis",
        say: `Des sushis. Ce n'est pas un pique-nique de carte postale, c'est le mien.`,
        goto: "apres", set: { menu: "Des sushis, assumés" } },
      { label: "Un petit-déjeuner, mais à 20 h",
        say: `Un petit-déjeuner. À 20 h. Viennoiseries au coucher du soleil.`,
        goto: "apres", set: { menu: "Un petit-déjeuner à 20 h" } },
    ],
  },

  /* ================= QUESTION COMMUNE ================= */
  apres: {
    bg: "@lieu", weather: "@lieu",
    cast: { bottom: "21%" },
    lines: [
      ["evan", `Dernière chose, et je te laisse tranquille.`],
      ["evan", `Après, on fait quoi ?`],
    ],
    choices: [
      { label: "On marche",
        say: `On marche. Sans direction précise.`,
        goto: "fin", set: { apres: "Puis on marche, sans direction" } },
      { label: "Un dernier verre",
        say: `Un dernier verre quelque part.`,
        goto: "fin", set: { apres: "Puis un dernier verre" } },
      { label: "Rentrer tôt (mensonge)",
        say: `On rentre tôt. On sait très bien que non.`,
        goto: "fin", set: { apres: "Puis on rentre tôt — soi-disant" } },
    ],
  },

  /* ================= FIN ================= */
  fin: {
    bg: "@lieu", weather: "@lieu", cast: { bottom: "21%" }, end: true,
    title: "@lieu", sub: "@menu", note: "@apres",
    lines: [
      ["lauryne", `C'est tout ? Je choisis et tu t'occupes du reste ?`],
      ["evan", `C'est tout. C'était l'idée depuis le début.`],
    ],
  },
};

/* décor, particules et thème musical associés à chaque lieu */
const LIEUX = {
  "Le parc":              { bg: "park",   weather: "petals" },
  "La forêt":             { bg: "forest", weather: "motes"  },
  "La plage":             { bg: "beach",  weather: "waves"  },
  "Au Comptoir Vénitien": { bg: "resto",  weather: "warmdust" },
  "BEY BEEF":             { bg: "resto",  weather: "warmdust" },
};

/* qui est qui, pour les portraits et les plaques de nom */
const CAST = {
  evan:    { name: HIM, portrait: "assets/portraits/evan.png" },
  lauryne: { name: HER, portrait: "assets/portraits/lauryne.png" },
};

const OUTRO = {
  stamp: "C'EST NOTÉ",
  signature: `Je passe te prendre à 19 h 40.`,
  cta: "Ajouter au calendrier",
  replay: "Recommencer",
};
