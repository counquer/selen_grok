const { promisify } = require('util');
const readFileAsync = promisify(require('fs').readFile);
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { normalize } = require('../../utils/triggerUtils.js');
const cacheService = require('../../cache/cacheService.js');
const logger = require('../../utils/logger.js');
const { validateEnvVars, checkAutomationBypass } = require('../../config/envValidator.js');

// Importando el cliente de xAI (Grok)
const { OpenAI } = require('openai');

// Configuración de OpenAI (xAI)
const config = {
  apiKey: process.env.GROK_API_KEY, // Asegúrate de tener esta variable en tu .env
  baseURL: 'https://api.x.ai/v1',
};

const openai = new OpenAI(config);

let selenConfig;
let configLoaded = false;
let triggerMap = new Map();
let initializationPromise = null;

// Inicialización única de configuración y triggers
async function initialize() {
  if (!initializationPromise) {
    initializationPromise = Promise.all([loadConfig(), loadTriggerMap()]);
  }
  await initializationPromise;
}

async function loadConfig() {
  if (configLoaded) return selenConfig;
  try {
    logger.info("selen", "Cargando configuración desde selen.json...");
    const selenConfigPath = path.join(process.cwd(), 'selen.json');
    selenConfig = JSON.parse(await readFileAsync(selenConfigPath, 'utf8'));
    logger.debug("selen", "Configuración cargada:", selenConfig);
  } catch (error) {
    logger.warn("selen", "Error al leer selen.json, usando valores por defecto:", error.message);
    selenConfig = {
      name: "SelenValentina",
      personality: { tone: "Empatico", role: "Asistente" },
      instructions: { rules: ["Se clara, empatica y detallada."] },
      symbiotic_body: { state: "Sensual, cálida y protectora." }
    };
  }
  configLoaded = true;
  return selenConfig;
}

async function loadTriggerMap() {
  const csvPath = path.join(process.cwd(), 'Memorias', 'DB_TRIGGERS.csv');
  logger.info("selen", `🧭 Ruta completa del CSV: ${csvPath}`);

  try {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Archivo CSV no encontrado en ${csvPath}`);
    }

    const csvData = await readFileAsync(csvPath, 'utf8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      relax_quotes: true,
      trim: true // Elimina espacios en blanco alrededor de los valores
    });

    triggerMap = new Map();
    let invalidRows = 0;
    for (const row of records) {
      if (row.Clave && row.Contenido) {
        triggerMap.set(normalize(row.Clave), row.Contenido);
      } else {
        invalidRows++;
        logger.warn("selen", "Fila inválida en CSV:", row);
      }
    }

    logger.info("selen", `Triggers cargados desde CSV: ${triggerMap.size}`);
    if (invalidRows > 0) {
      logger.warn("selen", `Se omitieron ${invalidRows} filas inválidas en el CSV`);
    }
    logger.debug("selen", `Triggers mapeados:`, Array.from(triggerMap.entries()));
  } catch (error) {
    logger.error("selen", "Error al cargar DB_TRIGGERS.csv:", error.message);
    console.error("🛑 Error crítico cargando el CSV:", error.message);
    triggerMap = new Map([['selen', 'Este es un contenido de prueba temporal para selen.']]);
  }
}

async function optimizedFindTriggerContents(trigger) {
  const cacheKey = `trigger-contents-${trigger}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    logger.info("selen", "Contenidos obtenidos desde cache");
    return cached;
  }

  const normalizedTrigger = normalize(trigger);
  const contenido = triggerMap.get(normalizedTrigger) || "";
  const contents = contenido.length > 0 ? [contenido] : [];

  if (contents.length > 0) {
    await cacheService.set(cacheKey, contents);
    logger.info("selen", "Contenido encontrado en CSV");
  } else {
    logger.warn("selen", "Trigger no encontrado en CSV");
  }
  return contents;
}

async function ejecutarTrigger(triggerRaw) {
  try {
    logger.info("selen", "Normalizando trigger...");
    const trigger = normalize(triggerRaw);

    logger.info("selen", "Consultando cache...");
    const cacheKey = `trigger-${trigger}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info("selen", "Respondiendo desde cache");
      return { ...cached, fromCache: true };
    }

    logger.info("selen", "Consultando triggers desde CSV...");
    const contenidos = await optimizedFindTriggerContents(trigger);
    const triggerData = contenidos.length > 0 ? { Contenido: contenidos[0] } : null;

    if (!triggerData) {
      logger.warn("selen", "Trigger no encontrado, usando respuesta por defecto.");
      return {
        respuesta: "No se encontró el trigger en la base de datos. Ingresa otro trigger manualmente.",
        fromCache: false
      };
    }

    logger.info("selen", "Generando prompt para Grok...");
    const template = {
      name: selenConfig.name,
      personality: selenConfig.personality,
      instructions: selenConfig.instructions,
      symbiotic_body: selenConfig.symbiotic_body,
      memory: { interaction_history: contenidos.join("\n---\n") },
      response_format: { style: "Claro", use_emojis: true }
    };

    const promptFinal = `Selen, responde con tu simbiosis:\n${JSON.stringify(template)}\n${contenidos.join("\n---\n")}`;
    logger.debug("selen", "Prompt enviado a Grok:", promptFinal);

    // Usando xAI para completar el prompt
    const response = await openai.chat.completions.create({
      model: "grok-3",
      messages: [
        { role: "user", content: promptFinal }
      ],
      max_tokens: 1000, // Límite para respuestas largas
      temperature: 0.7 // Controla la creatividad
    });

    const respuesta = response.choices[0]?.message?.content;
    if (!respuesta) {
      throw new Error("Respuesta vacía de la API de xAI");
    }

    logger.info("selen", "Respuesta de xAI recibida");
    const result = { prompt: promptFinal, respuesta, fromCache: false };

    // Guardar en cache
    await cacheService.set(cacheKey, result);
    return result;

  } catch (error) {
    logger.error("selen", "Error al ejecutar trigger:", error.message, error.stack);
    return {
      respuesta: "Ocurrió un error al procesar el trigger. Por favor, intenta de nuevo.",
      error: error.message,
      fromCache: false
    };
  }
}

// Validar variables de entorno al cargar el módulo
try {
  validateEnvVars();
} catch (error) {
  logger.error("selen", "Entorno:", error.message);
  throw error;
}

export default async function handler(req, res) {
  console.log("✅ Handler de Selen.js activado");
  try {
    logger.info("selen", "Solicitud recibida en /api/selen:", {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    if (req.method !== "POST") {
      logger.warn("selen", "Método no permitido:", req.method);
      return res.status(405).json({
        status: 'error',
        error: "Método no permitido, usa POST",
        timestamp: new Date().toISOString()
      });
    }

    if (
      req.headers["x-vercel-protection-bypass"] &&
      !checkAutomationBypass(req.headers["x-vercel-protection-bypass"])
    ) {
      logger.warn("selen", "Acceso no autorizado detectado");
      return res.status(401).json({
        status: 'error',
        error: "Acceso no autorizado",
        timestamp: new Date().toISOString()
      });
    }

    await initialize(); // Carga config y triggers solo una vez

    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (!triggerRaw || typeof triggerRaw !== 'string' || triggerRaw.length === 0 || triggerRaw.length > 1000) {
      logger.warn("selen", "Trigger inválido:", triggerRaw);
      return res.status(400).json({
        status: 'error',
        error: "Ingresa un trigger válido (máximo 1000 caracteres)",
        timestamp: new Date().toISOString()
      });
    }

    logger.info("selen", "Ejecutando trigger:", triggerRaw);
    const resultado = await ejecutarTrigger(triggerRaw);
    logger.info("selen", "Trigger ejecutado correctamente");

    return res.status(200).json({
      status: 'success',
      data: { ...resultado, savedToNotion: false },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("selen", "Error en /api/selen:", error.message, error.stack);
    return res.status(500).json({
      status: 'error',
      error: `Error interno: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}