import type { Messages } from "./en";

export const it: Messages = {
  language: "Lingua",
  close: "Chiudi ✕",
  gameId: "ID partita",
  createdBy: "Creato da",
  canvasLabel: "Model Trainz: il tuo treno e la ferrovia che stai costruendo",
  loading: {
    srLoading: "Caricamento. ",
    tips: [
      "Suggerimento: fai clic o tocca il terreno per posare i binari. Tieni premuto per continuare.",
      "Suggerimento: premi V per passare dalla cabina al plastico e viceversa.",
      "Suggerimento: la squadra di posa lavora per te mentre giochi.",
      "Suggerimento: i chiodi d'oro possono pagare 20× con un solo clic.",
      "Suggerimento: premi ` per mostrare il pannello di debug.",
    ],
  },
  profile: {
    formLabel: "Inizia a giocare",
    name: "Il tuo nome",
    namePlaceholder: "es. Ada",
    optional: "(facoltativo)",
    idPlaceholder: "es. 7K2M-9QXP-4HCW",
    idHint: "Hai l'ID di una partita precedente? Inseriscilo per continuare quella partita.",
    starting: "Avvio…",
    play: "Gioca",
    back: "Torna alla mia partita precedente",
    errors: {
      name: "Inserisci il tuo nome.",
      id: "Questo non è un ID partita: usa da 4 a 24 lettere, numeri o trattini.",
      offline:
        "Impossibile raggiungere il server di gioco per cercare quell'ID. Riprova, oppure lascialo vuoto per iniziare una nuova partita.",
    },
  },
  resume: {
    welcome: (name) => `Eccoti di nuovo, ${name}!`,
    waiting: "La tua ferrovia ti aspetta esattamente dove l'hai lasciata.",
    loading: "Caricamento…",
    continue: "Continua",
    other: "Inizia una nuova partita o inserisci un altro ID partita",
  },
  hud: {
    hintClick:
      "Fai clic sulla stazione (o in qualsiasi punto del terreno) per posare i binari. Tieni premuto per continuare!",
    hintTap:
      "Tocca la stazione (o qualsiasi punto del terreno) per posare i binari. Tieni premuto per continuare!",
    layTrack: "Posa binari",
    layTrackKey: "(Spazio)",
    goldenSpike: "CHIODO D'ORO!",
    departing: (station) => `Ciuf ciuf! In partenza da ${station}.`,
    arrived: (station, fare) => `Arrivo a ${station}: incasso +${fare}`,
  },
  status: {
    label: "Stato",
    traveling: (to) => `Sbuffando verso ${to}…`,
    layMore: (n, to) => `Posa ancora ${n} ${n === 1 ? "pezzo" : "pezzi"} per arrivare a ${to}`,
    allAboard: (to) => `In carrozza, si parte per ${to}!`,
    perClick: (n, shown) => `${shown} ${n === 1 ? "pezzo" : "pezzi"}/clic`,
    gangRate: (shown) => `${shown}/s dalla squadra di posa`,
    travelled: (distance) => `${distance} percorsi`,
    progressLabel: (to) => `Binari posati verso ${to}`,
  },
  menu: {
    game: "Partita",
    settings: "Impostazioni",
    reset: "Azzera",
    resetLabel: "Azzera i progressi",
    startOver: "Ricominciare da capo?",
    confirmReset: "Sì, azzera",
    cancel: "Annulla",
  },
  gameDialog: {
    title: "Partita",
    closeLabel: "Chiudi il pannello partita",
    player: "Giocatore",
    copy: "Copia ID",
    copied: "Copiato!",
    copiedAnnouncement: "ID partita copiato negli appunti.",
    explainer:
      "Conserva questo ID partita per continuare su qualsiasi dispositivo: inseriscilo nella schermata iniziale. Lo contiene anche la barra degli indirizzi, quindi un segnalibro ti riporta subito qui. Chiunque abbia l'ID può giocare questa partita.",
    explainerApp:
      "Conserva questo ID partita per continuare su qualsiasi dispositivo: inseriscilo nella schermata iniziale. Chiunque abbia l'ID può giocare questa partita.",
    sync: {
      idle: "Non ancora salvata online.",
      saving: "Salvataggio online…",
      saved: "Salvata online.",
      offline:
        "Al momento il server non è raggiungibile, quindi per ora i progressi vengono salvati su questo dispositivo.",
    },
  },
  settings: {
    title: "Impostazioni",
    closeLabel: "Chiudi le impostazioni",
    sound: "Audio",
    soundEffects: "Effetti sonori",
    volume: "Volume",
    quality: "Qualità grafica",
    qualityOptions: {
      auto: { label: "Auto", hint: "Si adatta al tuo dispositivo" },
      low: { label: "Bassa", hint: "Niente ombre né effetti" },
      medium: { label: "Media", hint: "Ombre + bloom" },
      high: { label: "Alta", hint: "Aggiunge ombre di contatto" },
      ultra: { label: "Ultra", hint: "Ombre più nitide" },
    },
    qualityNow: (level) => `Ora: ${level}`,
    controls: "Comandi",
    controlRows: [
      ["Clic / tocco sulla scena", "Posa un pezzo di binario"],
      ["Tieni premuto (mouse o dito)", "Continua a posare binari"],
      ["Spazio (tieni premuto per ripetere)", "Posa binari"],
      ["Pulsante Posa binari", "Posa binari"],
      ["V", "Cambia vista Plastico / Cabina"],
      ["Rotellina del mouse", "Zoom (vista Plastico)"],
      ["Trascina (vista Cabina)", "Guardati intorno"],
      ["Frecce / C (vista Cabina)", "Guardati intorno / ricentra"],
      ["`  (accento grave)", "Mostra o nascondi il pannello di debug"],
      ["Esc", "Chiudi questo pannello"],
    ],
  },
  shop: {
    label: "Negozio",
    upgrades: "Potenziamenti",
    depot: "Deposito",
    hide: "Nascondi",
    show: "Mostra",
    max: "MAX",
  },
  upgrades: {
    shovel: {
      name: "Pale più grandi",
      detail: "+1 pezzo di binario per clic",
      flavor: "Stesse braccia. Più entusiasmo.",
    },
    steel: {
      name: "Rotaie d'acciaio",
      detail: "+$1 per ogni pezzo di binario posato",
      flavor: "Più lucenti, quindi più costose.",
    },
    gang: {
      name: "Squadra di posa",
      detail: "+0.5 pezzi/s, in automatico",
      flavor: "Fischiettano mentre lavorano. A tutto volume.",
    },
    boiler: {
      name: "Caldaia rovente",
      detail: "+20% di velocità del treno",
      flavor: "Non leccare la caldaia.",
    },
    fares: {
      name: "Aumento tariffe",
      detail: "+25% sulle tariffe di stazione",
      flavor: "Ora con fuliggine in omaggio.",
    },
    carriage: {
      name: "Carrozza extra",
      detail: "+1 carrozza, +50% sulle tariffe",
      flavor: "Più posti, più biglietti.",
    },
    golden: {
      name: "Chiodi d'oro",
      detail: "+2% di probabilità che un clic paghi 20×",
      flavor: "Lucenti. Strutturalmente discutibili.",
    },
  },
  depot: {
    inService: "In servizio",
    use: "Usa",
  },
  trainSets: {
    heritage: {
      name: "Vapore storico",
      detail: "Locomotiva a vapore + carrozze in teak",
      flavor: "Dove tutto è cominciato.",
    },
    evergreen: {
      name: "Espresso Sempreverde",
      detail: "+50% velocità, +50% tariffe",
      flavor: "Tutto il fascino, niente carbone.",
    },
  },
  view: {
    label: "Vista telecamera (V)",
    diorama: "Plastico",
    cab: "Cabina",
  },
};
