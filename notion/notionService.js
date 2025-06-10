const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const path = require("path");
const { normalize } = require(path.resolve(__dirname, '../utils/triggerUtils.js'));
const logger = require(path.resolve(__dirname, '../utils/logger.js'));

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY || '' });
const DB_TRIGGERS = process.env.DB_TRIGGERS || '';
const DB_MEMORIA_CURADA = process.env.DB_MEMORIA_CURADA || '';

if (!process.env.NOTION_API_KEY || !DB_TRIGGERS || !DB_MEMORIA_CURADA) {
  logger.warn("notionService", "Alguna variable de entorno (NOTION_API_KEY, DB_TRIGGERS, DB_MEMORIA_CURADA) no está definida. Verifica .env.");
}

/**
 * Limpia texto: remueve caracteres invisibles y codifica como UTF-8 seguro.
 */
function sanitizarYCodificar(texto) {
  if (typeof texto !== "string") return "";
  const limpio = texto.trim().replace(/[\u001F\u007F-\u009F]/g, "");
  return encodeURIComponent(limpio);
}

/**
 * Divide texto largo en bloques compatibles con Notion (2000 caracteres cada uno).
 */
function dividirTextoEnBloques(texto, max = 1999) {
  const bloques = [];
  let posicion = 0;
  while (posicion < texto.length) {
    let fragmento = texto.slice(posicion, posicion + max);
    bloques.push({ text: { content: fragmento } });
    posicion += max;
  }
  return bloques;
}

/**
 * Busca memorias por trigger usando filtro contains y normalización básica.
 */
async function findTriggerContents(trigger) {
  try {
    const triggerNormalizado = normalize(trigger);
    const response = await notion.databases.query({
      database_id: DB_TRIGGERS,
      filter: {
        property: "Clave",
        rich_text: {
          contains: triggerNormalizado,
        },
      },
    });

    const contenidos = response.results.map((page) => {
      return page.properties?.Contenido?.rich_text?.[0]?.text?.content || "";
    }).filter(Boolean);

    logger.info("notion", `Se encontraron ${contenidos.length} memorias para trigger '${trigger}'`);
    return contenidos.length > 0 ? contenidos : ['No se encontraron contenidos.'];
  } catch (error) {
    logger.error("notion", "Error al consultar Notion:", error.message, error.stack);
    throw error;
  }
}

/**
 * Guarda una memoria curada en Notion con clave, sección, contenido dividido y timestamp.
 */
async function guardarMemoriaCurada(memoria) {
  try {
    const clave = memoria.clave?.trim() || "sin-clave";
    const seccion = memoria.seccion?.trim() || "general";
    const contenido = sanitizarYCodificar(memoria.contenido || "");
    const contenidoLimitado = contenido.slice(0, 3000);

    const propiedades = {
      Clave: { title: [{ text: { content: clave } }] },
      Seccion: { select: { name: seccion } },
      Contenido: { rich_text: [{ text: { content: contenidoLimitado } }] },
      Timestamp: { date: { start: memoria.timestamp || new Date().toISOString() } },
    };

    const response = await notion.pages.create({
      parent: { database_id: DB_MEMORIA_CURADA },
      properties: propiedades,
    });

    if (!response?.id) {
      logger.error("notion", "Respuesta inválida al guardar en Notion.");
      throw new Error("No se pudo guardar la memoria.");
    }

    logger.info("notion", "Memoria curada guardada correctamente:", response.id);
    return response;
  } catch (err) {
    logger.error("notion", "Error al guardar memoria curada:", err.message, err.stack);
    throw err;
  }
}

module.exports = {
  findTriggerContents,
  guardarMemoriaCurada,
};
