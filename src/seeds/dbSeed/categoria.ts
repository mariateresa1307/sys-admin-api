export const CATEGORIA_RED = [
  {
    "categoria": "CATEGORIA_RED",
    "valor": "CORE",
    "descripcion": "Elementos de red del núcleo principal",
    "activo": true,
    "tipoIncidencia": ["FALLA MASIVA", "FALLA PUNTUAL", "VENTANA DE MANTENIMIENTO"]
  },
  {
    "categoria": "CATEGORIA_RED",
    "valor": "TRANSPORTE",
    "descripcion": "Red de transporte y enlaces troncales",
    "activo": true,
    "tipoIncidencia": ["FALLA MASIVA", "FALLA PUNTUAL", "VENTANA DE MANTENIMIENTO"]
  },
  {
    "categoria": "CATEGORIA_RED",
    "valor": "ACCESO",
    "descripcion": "Red de acceso y última milla",
    "activo": true,
    "tipoIncidencia": ["FALLA PUNTUAL", "VENTANA DE MANTENIMIENTO"]
  },
  {
    "categoria": "CATEGORIA_RED",
    "valor": "INFRAESTRUCTURA",
    "descripcion": "Infraestructura física y servicios auxiliares",
    "activo": true,
    "tipoIncidencia": ["FALLA PUNTUAL", "VENTANA DE MANTENIMIENTO"]
  },
  {
    "categoria": "CATEGORIA_RED",
    "valor": "COMPONENTES",
    "descripcion": "Componentes individuales de la red",
    "activo": true,
    "tipoIncidencia": ["FALLA PUNTUAL", "VENTANA DE MANTENIMIENTO"]
  },
  {
    "categoria": "CATEGORIA_RED",
    "valor": "IT",
    "descripcion": "Infraestructura y sistemas de TI",
    "activo": true,
    "tipoIncidencia": ["FALLA PUNTUAL", "VENTANA DE MANTENIMIENTO"]
  },

  {
    "categoria": "SUBCATEGORIA",
    "valor": "ENLACE INTERNACIONAL",
    "descripcion": "Enlaces internacionales del núcleo",
    "activo": true,
    "categoriaId": "CORE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "ROUTER CORE",
    "descripcion": "Routers del núcleo principal",
    "activo": true,
    "categoriaId": "CORE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "CORE",
    "descripcion": "Elementos centrales del núcleo",
    "activo": true,
    "categoriaId": "CORE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "FIREWALL",
    "descripcion": "Firewalls del núcleo",
    "activo": true,
    "categoriaId": "CORE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "CORE OTT",
    "descripcion": "Elementos OTT del núcleo",
    "activo": true,
    "categoriaId": "CORE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "CORE TELEFONIA",
    "descripcion": "Telefonía del núcleo",
    "activo": true,
    "categoriaId": "CORE"
  },

  {
    "categoria": "SUBCATEGORIA",
    "valor": "ROUTER DISTRIBUCION",
    "descripcion": "Routers de distribución",
    "activo": true,
    "categoriaId": "TRANSPORTE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "ENLACE INTERURBANO",
    "descripcion": "Enlaces interurbanos",
    "activo": true,
    "categoriaId": "TRANSPORTE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "ROUTER AAA",
    "descripcion": "Routers AAA",
    "activo": true,
    "categoriaId": "TRANSPORTE"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "SWITCH",
    "descripcion": "Switches de transporte",
    "activo": true,
    "categoriaId": "TRANSPORTE"
  },

  {
    "categoria": "SUBCATEGORIA",
    "valor": "EQUIPO OLT",
    "descripcion": "Equipos OLT de acceso",
    "activo": true,
    "categoriaId": "ACCESO"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "EQUIPO AG",
    "descripcion": "Equipos AG de acceso",
    "activo": true,
    "categoriaId": "ACCESO"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "EQUIPO GETWAY",
    "descripcion": "Gateways de acceso",
    "activo": true,
    "categoriaId": "ACCESO"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "EQUIPO SWITCH",
    "descripcion": "Switches de acceso",
    "activo": true,
    "categoriaId": "ACCESO"
  },

  {
    "categoria": "SUBCATEGORIA",
    "valor": "ELECTRICA",
    "descripcion": "Sistema eléctrico",
    "activo": true,
    "categoriaId": "INFRAESTRUCTURA"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "REFRIGERACION",
    "descripcion": "Sistema de refrigeración",
    "activo": true,
    "categoriaId": "INFRAESTRUCTURA"
  },

  {
    "categoria": "SUBCATEGORIA",
    "valor": "DWDM",
    "descripcion": "Sistemas DWDM",
    "activo": true,
    "categoriaId": "COMPONENTES"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "MODULOS",
    "descripcion": "Módulos de red",
    "activo": true,
    "categoriaId": "COMPONENTES"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "FIBRA OPTICA",
    "descripcion": "Fibra óptica",
    "activo": true,
    "categoriaId": "COMPONENTES"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "TARJETA",
    "descripcion": "Tarjetas de red",
    "activo": true,
    "categoriaId": "COMPONENTES"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "PUERTO",
    "descripcion": "Puertos de red",
    "activo": true,
    "categoriaId": "COMPONENTES"
  },

  {
    "categoria": "SUBCATEGORIA",
    "valor": "SISTEMA IT INTERNA",
    "descripcion": "Sistemas IT internos",
    "activo": true,
    "categoriaId": "IT"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "BASE DE DATOS",
    "descripcion": "Bases de datos",
    "activo": true,
    "categoriaId": "IT"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "SERVIDORES",
    "descripcion": "Servidores",
    "activo": true,
    "categoriaId": "IT"
  },
  {
    "categoria": "SUBCATEGORIA",
    "valor": "DNS",
    "descripcion": "Servidores DNS",
    "activo": true,
    "categoriaId": "IT"
  },

  {
    "categoria": "DETALLE",
    "valor": "SIN GESTION",
    "descripcion": "Sin gestión activa",
    "activo": true,
    "categoriaId": "ENLACE INTERNACIONAL"
  },
  {
    "categoria": "DETALLE",
    "valor": "RECURSOS (MEMORIA / CPU)",
    "descripcion": "Recursos de memoria o CPU",
    "activo": true,
    "categoriaId": "ENLACE INTERNACIONAL"
  },
  {
    "categoria": "DETALLE",
    "valor": "SUMINISTRO ELECTRICO",
    "descripcion": "Suministro eléctrico",
    "activo": true,
    "categoriaId": "ENLACE INTERNACIONAL"
  },
  {
    "categoria": "DETALLE",
    "valor": "CONFIGURACION",
    "descripcion": "Configuración",
    "activo": true,
    "categoriaId": "ENLACE INTERNACIONAL"
  },
  {
    "categoria": "DETALLE",
    "valor": "EQUIPO AVERIADO",
    "descripcion": "Equipo averiado",
    "activo": true,
    "categoriaId": "ENLACE INTERNACIONAL"
  },

  {
    "categoria": "DETALLE",
    "valor": "SIN GESTION",
    "descripcion": "Sin gestión activa",
    "activo": true,
    "categoriaId": "ROUTER DISTRIBUCION"
  },
  {
    "categoria": "DETALLE",
    "valor": "RECURSOS (MEMORIA / CPU)",
    "descripcion": "Recursos de memoria o CPU",
    "activo": true,
    "categoriaId": "ROUTER DISTRIBUCION"
  },
  {
    "categoria": "DETALLE",
    "valor": "SUMINISTRO ELECTRICO",
    "descripcion": "Suministro eléctrico",
    "activo": true,
    "categoriaId": "ROUTER DISTRIBUCION"
  },
  {
    "categoria": "DETALLE",
    "valor": "CONFIGURACION",
    "descripcion": "Configuración",
    "activo": true,
    "categoriaId": "ROUTER DISTRIBUCION"
  },
  {
    "categoria": "DETALLE",
    "valor": "EQUIPO AVERIADO",
    "descripcion": "Equipo averiado",
    "activo": true,
    "categoriaId": "ROUTER DISTRIBUCION"
  },

  {
    "categoria": "DETALLE",
    "valor": "VNET - CADENA",
    "descripcion": "VNET en cadena",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "VNET - INTERMITENCIAS",
    "descripcion": "VNET con intermitencias",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "VNET - SATURACION",
    "descripcion": "VNET saturado",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "INTER - CADENA",
    "descripcion": "Internet en cadena",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "INTER - INTERMITENCIAS",
    "descripcion": "Internet con intermitencias",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "INTER - SATURACION",
    "descripcion": "Internet saturado",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "DIGITEL - CADENA",
    "descripcion": "Digitel en cadena",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "DIGITEL - INTERMITENCIAS",
    "descripcion": "Digitel con intermitencias",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },
  {
    "categoria": "DETALLE",
    "valor": "DIGITEL - SATURACION",
    "descripcion": "Digitel saturado",
    "activo": true,
    "categoriaId": "ENLACE INTERURBANO"
  },

  {
    "categoria": "DETALLE",
    "valor": "REDES PUBLICAS",
    "descripcion": "Redes públicas",
    "activo": true,
    "categoriaId": "ELECTRICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "INVERSOR",
    "descripcion": "Inversor",
    "activo": true,
    "categoriaId": "ELECTRICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "BREAKER",
    "descripcion": "Breaker",
    "activo": true,
    "categoriaId": "ELECTRICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "RECTIFICADOR",
    "descripcion": "Rectificador",
    "activo": true,
    "categoriaId": "ELECTRICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "PLANTA ELECTRICA",
    "descripcion": "Planta eléctrica",
    "activo": true,
    "categoriaId": "ELECTRICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "UPS",
    "descripcion": "UPS",
    "activo": true,
    "categoriaId": "ELECTRICA"
  },

  {
    "categoria": "DETALLE",
    "valor": "TEMPERATURA",
    "descripcion": "Temperatura",
    "activo": true,
    "categoriaId": "REFRIGERACION"
  },
  {
    "categoria": "DETALLE",
    "valor": "SUMINISTRO ELECTRICO",
    "descripcion": "Suministro eléctrico",
    "activo": true,
    "categoriaId": "REFRIGERACION"
  },

  {
    "categoria": "DETALLE",
    "valor": "CORTE DE FIBRA",
    "descripcion": "Corte de fibra",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "MODULO",
    "descripcion": "Módulo",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "TARJETA",
    "descripcion": "Tarjeta",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "PATCHCORD",
    "descripcion": "Patchcord",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "POSTAL",
    "descripcion": "Postal",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "CONFIGURACION",
    "descripcion": "Configuración",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "INTERACCION",
    "descripcion": "Interacción",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "INTERMITENCIAS",
    "descripcion": "Intermitencias",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },

  {
    "categoria": "DETALLE",
    "valor": "SFP TRANSCEIVER",
    "descripcion": "SFP Transceiver",
    "activo": true,
    "categoriaId": "MODULOS"
  },
  {
    "categoria": "DETALLE",
    "valor": "POSTAL",
    "descripcion": "Postal",
    "activo": true,
    "categoriaId": "MODULOS"
  },

  {
    "categoria": "DETALLE",
    "valor": "CORTE DE FIBRA",
    "descripcion": "Corte de fibra",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "ATENUACION",
    "descripcion": "Atenuación",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },
  {
    "categoria": "DETALLE",
    "valor": "INTERMITENCIAS",
    "descripcion": "Intermitencias",
    "activo": true,
    "categoriaId": "FIBRA OPTICA"
  },

  {
    "categoria": "DETALLE",
    "valor": "PERDIDA DE INFORMACION",
    "descripcion": "Pérdida de información",
    "activo": true,
    "categoriaId": "BASE DE DATOS"
  },
  {
    "categoria": "DETALLE",
    "valor": "INFORMACION INCONSISTENTE",
    "descripcion": "Información inconsistente",
    "activo": true,
    "categoriaId": "BASE DE DATOS"
  },
  {
    "categoria": "DETALLE",
    "valor": "EQUIPO AVERIADO",
    "descripcion": "Equipo averiado",
    "activo": true,
    "categoriaId": "BASE DE DATOS"
  },

  {
    "categoria": "DETALLE",
    "valor": "SIN GESTION",
    "descripcion": "Sin gestión",
    "activo": true,
    "categoriaId": "SERVIDORES"
  },
  {
    "categoria": "DETALLE",
    "valor": "RECURSOS (MEMORIA / CPU)",
    "descripcion": "Recursos de memoria o CPU",
    "activo": true,
    "categoriaId": "SERVIDORES"
  },
  {
    "categoria": "DETALLE",
    "valor": "SUMINISTRO ELECTRICO",
    "descripcion": "Suministro eléctrico",
    "activo": true,
    "categoriaId": "SERVIDORES"
  },
  {
    "categoria": "DETALLE",
    "valor": "CONFIGURACION",
    "descripcion": "Configuración",
    "activo": true,
    "categoriaId": "SERVIDORES"
  },
  {
    "categoria": "DETALLE",
    "valor": "EQUIPO AVERIADO",
    "descripcion": "Equipo averiado",
    "activo": true,
    "categoriaId": "SERVIDORES"
  },

  {
    "categoria": "DETALLE",
    "valor": "SISTEMAS IT INTERNAS",
    "descripcion": "Sistemas IT internas",
    "activo": true,
    "categoriaId": "SISTEMA IT INTERNA"
  },
  {
    "categoria": "DETALLE",
    "valor": "BASE DE DATOS",
    "descripcion": "Base de datos",
    "activo": true,
    "categoriaId": "SISTEMA IT INTERNA"
  },
  {
    "categoria": "DETALLE",
    "valor": "SERVIDORES",
    "descripcion": "Servidores",
    "activo": true,
    "categoriaId": "SISTEMA IT INTERNA"
  },
  {
    "categoria": "DETALLE",
    "valor": "DNS",
    "descripcion": "DNS",
    "activo": true,
    "categoriaId": "SISTEMA IT INTERNA"
  }
]