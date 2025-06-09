const { normalize } = require('../../utils/triggerUtils.js');
const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const logger = require("../utils/logger.js");
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DB_TRIGGERS = process.env.DB_TRIGGERS;
const DB_MEMORIA_CURADA = process.env.DB_MEMORIA_CURADA;

/**
 * Limpia texto: remueve caracteres invisibles y codifica como UTF-8 seguro.
 */
function sanitizarYCodificar(texto) {
  if (typeof texto !== "string") return "";
  const limpio = texto.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return unescape(encodeURIComponent(limpio));
}

/**
 * Divide texto largo en bloques compatibles con Notion (≤2000 caracteres cada uno).
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
 * Busca memorias por trigger usando filtro contains y normalización básica
 */
async function findTriggerContents(trigger) {
  try {
    const triggerNormalizado = trigger.trim().toLowerCase();

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
      const contenido = page.properties?.Contenido?.rich_text?.[0]?.text?.content || "";
      return contenido;
    }).filter(Boolean);

    logger.info("notion", `Se encontraron ${contenidos.length} memorias para trigger '${trigger}'`);
    return contenidos;
  } catch (error) {
    logger.error("notion", "Error al consultar Notion:", error.message);
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
    const contenidoLimitado = contenido.slice(0, 3000); // ✅ Límite
    const timestamp = memoria.timestamp || new Date().toISOString();

    const propiedades = {
      Clave: {
        title: [{ text: { content: clave } }],
      },
      Seccion: {
        select: { name: seccion },
      },
      Contenido: {
        rich_text: [{ text: { content: contenidoLimitado } }],
      },
      Timestamp: {
        date: { start: timestamp },
      },
    };

    const response = await notion.pages.create({
      parent: { database_id: DB_MEMORIA_CURADA },
      properties: propiedades,
    });

    if (!response || !response.id) {
      logger.error("notion", "Respuesta inválida al guardar en Notion.");
      throw new Error("No se pudo guardar la memoria.");
    }

    logger.info("notion", "Memoria curada guardada correctamente:", response.id);
    return response;
  } catch (err) {
    logger.error("notion", "Error al guardar memoria curada:", err.message);
    throw err;
  }
}

module.exports = {
  guardarMemoriaCurada,
  findTriggerContents,
};