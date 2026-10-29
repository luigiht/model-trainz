import type { Messages } from "./en";

export const es: Messages = {
  language: "Idioma",
  close: "Cerrar ✕",
  gameId: "ID de partida",
  createdBy: "Creado por",
  canvasLabel: "Model Trainz: tu tren y el ferrocarril que estás construyendo",
  loading: {
    srLoading: "Cargando. ",
    tips: [
      "Consejo: haz clic o toca el terreno para colocar vía. Mantén pulsado para seguir.",
      "Consejo: pulsa V para saltar entre la cabina y la vista de maqueta.",
      "Consejo: la cuadrilla de vía coloca vía por ti mientras juegas.",
      "Consejo: los clavos de oro pueden pagar 20× en un solo clic.",
      "Consejo: pulsa ` para mostrar el panel de depuración.",
    ],
  },
  profile: {
    formLabel: "Empezar a jugar",
    name: "Tu nombre",
    namePlaceholder: "p. ej. Ada",
    optional: "(opcional)",
    idPlaceholder: "p. ej. 7K2M-9QXP-4HCW",
    idHint: "¿Tienes el ID de una partida anterior? Escríbelo para seguir jugando esa partida.",
    starting: "Empezando…",
    play: "Jugar",
    back: "Volver a mi partida anterior",
    errors: {
      name: "Escribe tu nombre.",
      id: "Eso no es un ID de partida: usa de 4 a 24 letras, números o guiones.",
      offline:
        "No se pudo conectar con el servidor del juego para buscar ese ID. Inténtalo de nuevo, o déjalo vacío para empezar una partida nueva.",
    },
  },
  resume: {
    welcome: (name) => `¡Hola de nuevo, ${name}!`,
    waiting: "Tu ferrocarril te espera justo donde lo dejaste.",
    loading: "Cargando…",
    continue: "Continuar",
    other: "Empezar una partida nueva o usar otro ID de partida",
  },
  hud: {
    hintClick:
      "Haz clic en la estación (o en cualquier parte del terreno) para colocar vía. ¡Mantén pulsado para seguir!",
    hintTap:
      "Toca la estación (o cualquier parte del terreno) para colocar vía. ¡Mantén pulsado para seguir!",
    layTrack: "Colocar vía",
    layTrackKey: "(Espacio)",
    goldenSpike: "¡CLAVO DE ORO!",
    departing: (station) => `¡Chu chu! Saliendo de ${station}.`,
    arrived: (station, fare) => `Llegada a ${station}: recaudación +${fare}`,
  },
  status: {
    label: "Estado",
    traveling: (to) => `Traqueteando hacia ${to}…`,
    layMore: (n, to) => `Coloca ${n} ${n === 1 ? "pieza" : "piezas"} más para llegar a ${to}`,
    allAboard: (to) => `¡Pasajeros al tren, destino ${to}!`,
    perClick: (n, shown) => `${shown} ${n === 1 ? "pieza" : "piezas"}/clic`,
    gangRate: (shown) => `${shown}/s de la cuadrilla`,
    travelled: (distance) => `${distance} recorridos`,
    progressLabel: (to) => `Vía colocada hacia ${to}`,
  },
  menu: {
    game: "Partida",
    settings: "Ajustes",
    reset: "Reiniciar",
    resetLabel: "Reiniciar progreso",
    startOver: "¿Empezar de cero?",
    confirmReset: "Sí, reiniciar",
    cancel: "Cancelar",
  },
  gameDialog: {
    title: "Partida",
    closeLabel: "Cerrar panel de partida",
    player: "Jugador",
    copy: "Copiar ID",
    copied: "¡Copiado!",
    copiedAnnouncement: "ID de partida copiado al portapapeles.",
    explainer:
      "Guarda este ID de partida para continuarla en cualquier dispositivo: escríbelo en la pantalla de inicio. La barra de direcciones también lo incluye, así que un marcador te trae de vuelta directamente. Cualquiera que tenga el ID puede jugar esta partida.",
    explainerApp:
      "Guarda este ID de partida para continuarla en cualquier dispositivo: escríbelo en la pantalla de inicio. Cualquiera que tenga el ID puede jugar esta partida.",
    sync: {
      idle: "Aún no se ha guardado en línea.",
      saving: "Guardando en línea…",
      saved: "Guardada en línea.",
      offline:
        "Ahora mismo no se puede conectar con el servidor, así que por ahora el progreso se guarda en este dispositivo.",
    },
    delete: {
      button: "Borrar esta partida",
      confirm:
        "¿Borrar esta partida, tu nombre y su ID de partida del servidor y de este dispositivo? No se puede deshacer.",
      yes: "Sí, borrar",
      deleting: "Borrando…",
      failed:
        "No se pudo conectar con el servidor, así que no se ha borrado nada. Inténtalo de nuevo más tarde.",
    },
  },
  settings: {
    title: "Ajustes",
    closeLabel: "Cerrar ajustes",
    sound: "Sonido",
    soundEffects: "Efectos de sonido",
    volume: "Volumen",
    quality: "Calidad gráfica",
    qualityOptions: {
      auto: { label: "Auto", hint: "Se adapta a tu dispositivo" },
      low: { label: "Baja", hint: "Sin sombras ni efectos" },
      medium: { label: "Media", hint: "Sombras + brillo" },
      high: { label: "Alta", hint: "Añade oclusión ambiental" },
      ultra: { label: "Ultra", hint: "Sombras más nítidas" },
    },
    qualityNow: (level) => `Ahora: ${level}`,
    controls: "Controles",
    controlRows: [
      ["Clic / toque en la escena", "Colocar una pieza de vía"],
      ["Mantener pulsado (ratón o dedo)", "Seguir colocando vía"],
      ["Espacio (mantén para repetir)", "Colocar vía"],
      ["Botón Colocar vía", "Colocar vía"],
      ["V", "Cambiar vista Maqueta / Cabina"],
      ["Rueda del ratón", "Zoom (vista Maqueta)"],
      ["Arrastrar (vista Cabina)", "Mirar alrededor"],
      ["Flechas / C (vista Cabina)", "Mirar alrededor / recentrar"],
      ["`  (acento grave)", "Mostrar u ocultar el panel de depuración"],
      ["Esc", "Cerrar este panel"],
    ],
  },
  shop: {
    label: "Tienda",
    upgrades: "Mejoras",
    depot: "Depósito",
    hide: "Ocultar",
    show: "Mostrar",
    max: "MÁX",
  },
  upgrades: {
    shovel: {
      name: "Palas más grandes",
      detail: "+1 pieza de vía por clic",
      flavor: "Los mismos brazos. Más entusiasmo.",
    },
    steel: {
      name: "Rieles de acero",
      detail: "+$1 por cada pieza de vía colocada",
      flavor: "Más relucientes, y por tanto más caros.",
    },
    gang: {
      name: "Cuadrilla de vía",
      detail: "+0.5 piezas/s, automáticamente",
      flavor: "Silban mientras trabajan. A todo pulmón.",
    },
    boiler: {
      name: "Caldera ardiente",
      detail: "+20% de velocidad del tren",
      flavor: "No lamas la caldera.",
    },
    fares: {
      name: "Subida de tarifas",
      detail: "+25% en las tarifas de estación",
      flavor: "Ahora con hollín de cortesía.",
    },
    carriage: {
      name: "Vagón extra",
      detail: "+1 vagón, +50% en tarifas",
      flavor: "Más asientos, más pasajeros.",
    },
    golden: {
      name: "Clavos de oro",
      detail: "+2% de probabilidad de que un clic pague 20×",
      flavor: "Relucientes. Estructuralmente dudosos.",
    },
  },
  depot: {
    inService: "En servicio",
    use: "Usar",
  },
  trainSets: {
    heritage: {
      name: "Vapor histórico",
      detail: "Locomotora tanque de vapor + coches de teca",
      flavor: "Donde todo empezó.",
    },
    evergreen: {
      name: "Expreso Siempreverde",
      detail: "+50% velocidad, +50% tarifas",
      flavor: "Todo el encanto, nada de carbón.",
    },
  },
  view: {
    label: "Vista de cámara (V)",
    diorama: "Maqueta",
    cab: "Cabina",
  },
  privacy: {
    link: "Política de privacidad",
    title: "Política de privacidad",
    updated: "Última actualización: 29 de octubre de 2026",
    back: "Volver al juego",
    sections: [
      {
        heading: "Quiénes somos",
        body: [
          "Model Trainz es un juego creado por Luis Hermosilla. Esta política cubre la web (model-trainz.luigiht.com) y las apps de iOS y Android.",
        ],
      },
      {
        heading: "Qué guarda el juego",
        body: [
          "El nombre que escribes al empezar (vale un apodo), el ID de partida que crea el juego y tu progreso: vía colocada, monedas, mejoras y trenes.",
          "Tus ajustes (idioma, sonido, gráficos) se quedan en tu dispositivo.",
          "Nada más: ni correo, ni cuentas, ni ubicación, ni contactos, ni identificadores del dispositivo. No hay anuncios, ni analíticas, ni seguimiento.",
        ],
      },
      {
        heading: "Para qué",
        body: [
          "Solo para guardar tu partida en línea, para que puedas continuarla en cualquier dispositivo con tu ID de partida. Tu nombre solo lo ves tú y quien tenga tu ID de partida; no hay listas públicas ni clasificaciones.",
        ],
      },
      {
        heading: "Dónde se guarda",
        body: [
          "En tu dispositivo y en el servidor del juego (alojado en Vercel, con la base de datos en Supabase). Viaja por una conexión cifrada (HTTPS). Nunca se vende ni se comparte con nadie más.",
          "Como cualquier web, estos proveedores pueden guardar durante poco tiempo registros técnicos (como direcciones IP) para mantener el servicio seguro y en marcha.",
        ],
      },
      {
        heading: "Cuánto tiempo, y cómo borrarlo",
        body: [
          "Las partidas en línea se guardan hasta que las borras. Para borrar tu partida del servidor y de tu dispositivo, abre Partida en el juego y elige \"Borrar esta partida\". Así se eliminan para siempre tu nombre, tu ID de partida y tu progreso.",
        ],
      },
      {
        heading: "Menores",
        body: [
          "El juego no pide el nombre real ni datos de contacto de nadie, y es apto para todas las edades. Los padres pueden borrar la partida de un menor como se explica arriba, o escribiéndonos.",
        ],
      },
      {
        heading: "Cambios",
        body: ["Si esta política cambia, la nueva versión se publicará aquí con una fecha nueva."],
      },
    ],
    contactHeading: "Contacto",
    contact: "¿Dudas, o no puedes abrir tu partida para borrarla? Escríbenos con tu ID de partida a",
  },
};
