/* ---------------------------------------------------------------
   HISTOIRE + ARBRE DE CHOIX
   Ton : simple, court, mais chaleureux. Evan réagit à ce qu'elle dit.
--------------------------------------------------------------- */

const HER = "Lauryne";
const HIM = "Evan";

/* =====  QUAND  ===============================================
   Pas de question sur la date : personne ne connaît encore le jour.
   Evan annonce simplement la période, et c'est ce qui s'affiche
   sur le ticket final.

   ↓↓↓  CHANGE JUSTE CES DEUX LIGNES  ↓↓↓
   QUAND        = ce qui apparaît sur le ticket
   QUAND_PARLE  = comment Evan le dit à voix haute
=============================================================== */
const QUAND       = "Au mois d'août";
const QUAND_PARLE = `C'est prévu pour le mois d'août.`;

const STORY = {

  /* ================= OUVERTURE ================= */
  start: {
    bg: "street", weather: "fireflies",
    lines: [
      ["evan", `Salut toi.`],
      ["evan", `J'ai une petite surprise pour toi.`],
      ["evan", QUAND_PARLE],
      ["evan", `Rien de compliqué, promis. J'ai juste besoin de ton avis sur deux ou trois trucs.`],
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
      ["evan", `Je me doutais un peu de la réponse.`],
      ["evan", `Tu préfères qu'on fasse quoi ?`],
    ],
    choices: [
      { label: "Aller au restaurant", say: `Aller au restaurant.`, goto: "resto_choix" },
      { label: "Un pique-nique",      say: `Un pique-nique.`,      goto: "picnic_lieu" },
    ],
  },

  /* ================= RESTAURANT ================= */
  resto_choix: {
    bg: "resto", weather: "warmdust", teleport: true,
    lines: [
      ["evan", `Bonne idée. J'ai deux adresses en tête.`],
      ["evan", `Laquelle te tente le plus ?`],
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
      ["evan", `Ah, j'aime bien. Je m'occupe du panier alors.`],
      ["evan", `On irait où ?`],
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
      ["evan", `Je me disais bien que ça te plairait.`],
      ["evan", `Je mets quoi dans le panier ?`],
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
      ["evan", `Dernière question, promis.`],
      ["evan", `On fait quoi après ?`],
    ],
    choices: [
      { label: "On marche",        say: `On marche.`,        goto: "fin", set: { apres: "Et après, on marche", duo: "marche" } },
      { label: "Un dernier verre", say: `Un dernier verre.`, goto: "fin", set: { apres: "Et après, un dernier verre" } },
      { label: "On verra",         say: `On verra.`,         goto: "fin", set: { apres: "Et après, on verra" } },
    ],
  },

  /* ================= FIN ================= */
  fin: {
    bg: "@lieu", weather: "@lieu", cast: { bottom: "21%", duo: "@duo" }, end: true,
    title: "@lieu", sub: "@menu", note: "@apres", date: QUAND,
    lines: [
      ["evan", `Voilà, j'ai tout ce qu'il me faut.`],
      ["evan", `Je m'occupe du reste et je te dis le jour très vite.`],
      ["evan", `Je t'aime.`],
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
  /* sans date précise on ne promet pas d'heure ; si tu remplis un `iso`
     ci-dessus, remets ici quelque chose comme « Je passe te prendre à 19 h 40. » */
  signature: `Je te confirme le jour très vite.`,
  cta: "Ajouter au calendrier",
  replay: "Recommencer",
};
