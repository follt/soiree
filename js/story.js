/* ---------------------------------------------------------------
   HISTOIRE + ARBRE DE CHOIX
   Ton : simple et direct. Phrases courtes. Aucune mise en scène.
   -----------------------------------------------------------------
   Réplique : ["evan" | "lauryne", "texte"]
   Choix    : { label, say, goto, set }
--------------------------------------------------------------- */

const HER = "Lauryne";
const HIM = "Evan";

const STORY = {

  /* ================= OUVERTURE ================= */
  start: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Salut toi.`],
      ["evan", `J'ai une petite surprise pour ce soir.`],
      ["evan", `Mais j'ai deux ou trois questions à te poser avant.`],
      ["evan", `Ça te dit ?`],
    ],
    choices: [
      { label: "Oui", say: `Oui.`, goto: "carrefour" },
      { label: "Oui", say: `Oui.`, goto: "carrefour" },
    ],
  },

  carrefour: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Voilà, c'était bien parti.`],
      ["evan", `Tu préfères qu'on aille où ?`],
    ],
    choices: [
      { label: "Au restaurant", say: `Au restaurant.`,   goto: "resto_choix" },
      { label: "En pique-nique", say: `En pique-nique.`, goto: "picnic_lieu" },
    ],
  },

  /* ================= RESTAURANT ================= */
  resto_choix: {
    bg: "resto", weather: "warmdust", cast: false, teleport: true,
    lines: [
      ["evan", `Ok. J'ai deux adresses en tête.`],
      ["evan", `Laquelle te tente ?`],
    ],
    choices: [
      { label: "Au Comptoir Vénitien", say: `Le Comptoir Vénitien.`,
        goto: "apres", set: { lieu: "Au Comptoir Vénitien", menu: "Une table pour deux" } },
      { label: "BEY BEEF", say: `BEY BEEF.`,
        goto: "apres", set: { lieu: "BEY BEEF", menu: "Une table pour deux" } },
    ],
  },

  /* ================= PIQUE-NIQUE ================= */
  picnic_lieu: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Parfait, je m'occupe du panier.`],
      ["evan", `On va où ?`],
    ],
    choices: [
      { label: "Dans un parc", say: `Dans un parc.`, goto: "picnic_menu", set: { lieu: "Le parc" } },
      { label: "En forêt",     say: `En forêt.`,     goto: "picnic_menu", set: { lieu: "La forêt" } },
      { label: "À la plage",   say: `À la plage.`,   goto: "picnic_menu", set: { lieu: "La plage" } },
    ],
  },

  picnic_menu: {
    bg: "@lieu", weather: "@lieu", teleport: true,
    cast: { bottom: "21%" },
    lines: [
      ["lauryne", `Oh.`],
      ["evan", `Content que ça te plaise.`],
      ["evan", `Tu veux manger quoi ?`],
    ],
    choices: [
      { label: "Un truc simple", say: `Un truc simple.`,
        goto: "apres", set: { menu: "Pain, fromage, une bouteille" } },
      { label: "Des sushis", say: `Des sushis.`,
        goto: "apres", set: { menu: "Des sushis" } },
      { label: "Un petit-déj, mais le soir", say: `Un petit-déj. Mais le soir.`,
        goto: "apres", set: { menu: "Un petit-déjeuner, le soir" } },
    ],
  },

  /* ================= QUESTION COMMUNE ================= */
  apres: {
    bg: "@lieu", weather: "@lieu",
    cast: { bottom: "21%" },
    lines: [
      ["evan", `Dernière question.`],
      ["evan", `On fait quoi après ?`],
    ],
    choices: [
      { label: "On marche",        say: `On marche.`,        goto: "fin", set: { apres: "Et après, on marche" } },
      { label: "Un dernier verre", say: `Un dernier verre.`, goto: "fin", set: { apres: "Et après, un dernier verre" } },
      { label: "On verra",         say: `On verra.`,         goto: "fin", set: { apres: "Et après, on verra" } },
    ],
  },

  /* ================= FIN ================= */
  fin: {
    bg: "@lieu", weather: "@lieu", cast: { bottom: "21%" }, end: true,
    title: "@lieu", sub: "@menu", note: "@apres",
    lines: [
      ["evan", `C'est tout ce que j'avais besoin de savoir.`],
      ["evan", `À ce soir.`],
    ],
  },
};

/* décor et particules associés à chaque lieu */
const LIEUX = {
  "Le parc":              { bg: "park",   weather: "petals" },
  "La forêt":             { bg: "forest", weather: "motes"  },
  "La plage":             { bg: "beach",  weather: "waves"  },
  "Au Comptoir Vénitien": { bg: "resto",  weather: "warmdust" },
  "BEY BEEF":             { bg: "resto",  weather: "warmdust" },
};

/* portraits et plaques de nom */
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
