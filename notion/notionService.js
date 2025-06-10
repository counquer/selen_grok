const { Client } = require('@notionhq/client');
const { normalize } = require('../utils/triggerUtils.js');
const logger = require('../utils/logger.js');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function findTriggerContents(trigger) {
  try {
    const response = await notion.databases.query({
      database_id: process.env.DB_TRIGGERS,
      filter: {
        property: 'Trigger', // Ajusta este nombre según tu base de datos
        rich_text: { contains: normalize(trigger) },
      },
    });
    const contents = response.results.map(page => page.properties.Content?.rich_text[0]?.plain_text || '');
    if (contents.length === 0) {
      logger.warn("notion", "No se encontró trigger en Notion, usando valor por defecto.");
      const defaultTrigger = process.env.DEFAULT_TRIGGER;
      return defaultTrigger ? [defaultTrigger] : [];
    }
    return contents;
  } catch (error) {
    logger.error("notion", "Error en findTriggerContents:", error.message);
    if (error.code === 'validation_error' && error.message.includes('Could not find property')) {
      logger.warn("notion", "Propiedad 'Trigger' no encontrada. Usando valor por defecto.");
      const defaultTrigger = process.env.DEFAULT_TRIGGER;
      return defaultTrigger ? [defaultTrigger] : [];
    }
    throw error;
  }
}

async function guardarMemoriaCurada(data) {
  try {
    await notion.pages.create({
      parent: { database_id: process.env.DB_MEMORIA_CURADA },
      properties: {
        Title: { title: [{ text: { content: data.clave } }] },
        Contenido: { rich_text: [{ text: { content: data.contenido } }] },
        Prioridad: { select: { name: data.prioridad } },
        Estado: { select: { name: data.estado } },
        Categoria_Emocional: { select: { name: data.categoria_emocional } },
        Etiquetas: { multi_select: data.etiquetas.map(tag => ({ name: tag })) },
        Timestamp: { date: { start: data.timestamp } },
      },
    });
  } catch (error) {
    logger.error("notion", "Error en guardarMemoriaCurada:", error.message);
    throw error;
  }
}

module.exports = { findTriggerContents, guardarMemoriaCurada };