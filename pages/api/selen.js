// pages/api/selen.js: API para SelenValentina, un asistente impulsado por IA.
// Procesa solicitudes POST a /api/selen con un campo 'trigger' en el cuerpo o query.
// Usa grokService para respuestas de IA, cacheService para caché y Notion para almacenamiento.

const path = require('path');
const fs = require('fs');
const { normalize } = require(path.join(process.cwd(), 'utils', 'triggerUtils.js'));
const { findTriggerContents, guardarMemoriaCurada } = require(path.join(process.cwd(), 'notion', 'notionService.js'));
const cacheService = require(path.join(process.cwd(), 'cache', 'cacheService.js'));
const grokService = require(path.join(process.cwd(), 'grok', 'grokService.js'));
const logger = require(path.join(process.cwd(), 'utils', 'logger.js'));
const { validateEnvVars, checkAutomationBypass } = require(path.join(process.cwd(), 'config', 'envValidator.js'));

// Validar variables de entorno al inicio
try {
  validateEnvVars();
} catch (error) {
  logger.error("selen", "Error al validar variables de entorno:", error.message, error.stack);
  throw error;
}

// Cargar y validar configuración Selen
const selenConfigPath = path.join(process.cwd(), 'selen.json');
let selenConfig;
try {
  selenConfig = fs.existsSync(selenConfigPath)
    ? JSON.parse(fs.readFileSync(selenConfigPath, 'utf8'))
    : {
        name: "SelenValentina",
        personality: { tone: "Empático", role: "Asistente" },
        instructions: { rules: ["Sé clara, empática y detallada."] },
        symbiotic_body: { state: "Sensual, cálida y protectora." },
      };

  // Validar campos requeridos en la configuración
  const requiredFields = ['name', 'personality', 'instructions', 'symbiotic_body'];
  for (const field of requiredFields) {
    if (!selenConfig[field]) {
      throw new Error(`Falta el campo requerido en selenConfig: ${field}`);
    }
  }
} catch (error) {
  logger.error("selen", "Error al leer o parsear selen.json:", error.message, error.stack);
  selenConfig = {
    name: "SelenValentina",
    personality: { tone: "Empático", role: "Asistente" },
    instructions: { rules: ["Sé clara, empática y detallada."] },
    symbiotic_body: { state: "Sensual, cálida y protectora." },
  };
}

// Handler para API POST
export default async function handler(req, res) {
  try {
    logger.info("selen", "Solicitud recibida en /api/selen:", {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers,
    });

    if (req.method !== "POST") {
      return res.status(405).json({
        status: 'error',
        error: "Método no permitido, usa POST",
        timestamp: new Date().toISOString(),
      });
    }

    const authHeader = req.headers["x-vercel-protection-bypass"];
    if (authHeader && !checkAutomationBypass(authHeader)) {
      return res.status(401).json({
        status: 'error',
        error: "Acceso no autorizado: protección Vercel activa",
        timestamp: new Date().toISOString(),
      });
    }

    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (typeof triggerRaw !== 'string' || triggerRaw.length === 0 || triggerRaw.length > 1000) {
      return res.status(400).json({
        status: 'error',
        error: "El campo 'trigger' debe ser una cadena válida y no exceder 1000 caracteres",
        timestamp: new Date().toISOString(),
      });
    }

    const resultado = await ejecutarTrigger(triggerRaw);
    return res.status(200).json({
      status: 'success',
      data: { ...resultado, savedToNotion: true },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("selen", "Error en la función /api/selen:", error.message, error.stack);
    console.error("Error detallado:", {
      message: error.message,
      stack: error.stack,
      triggerRaw,
      request: { method: req.method, url: req.url, body: req.body, query: req.query },
    }); // Log temporal para depuración
    return res.status(500).json({
      status: 'error',
      error: `Error interno del servidor: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
}

// Lógica compartida API
async function ejecutarTrigger(triggerRaw) {
  try {
    const trigger = normalize(triggerRaw);
    logger.info("selen", "Trigger recibido normalizado:", trigger);

    const cacheKey = `trigger-${trigger}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info("selen", "Respondiendo desde caché");
      return { ...cached, fromCache: true };
    }

    const contenidos = await findTriggerContents(trigger);
    if (!contenidos || contenidos.length === 0) {
      throw new Error("No se encontraron memorias con la clave proporcionada.");
    }

    const template = {
      name: selenConfig.name,
      personality: selenConfig.personality,
      instructions: selenConfig.instructions,
      symbiotic_body: selenConfig.symbiotic_body,
      memory: { interaction_history: contenidos.join("\n---\n") },
      response_format: { style: "Claro", use_emojis: true },
    };

    const promptFinal = `Selen, responde con toda tu simbiosis y contexto histórico siguiendo este template:\n\n${JSON.stringify(template)}\n\nContenido: ${contenidos.join("\n---\n")}`;
    const respuestaGrok = await grokService.completar(promptFinal);

    await guardarMemoriaCurada({
      clave: trigger,
      seccion: "general",
      contenido: respuestaGrok,
      prioridad: "alta",
      estado: "activo",
      categoria_emocional: "neutral",
      etiquetas: ["automático", "grok"],
      timestamp: new Date().toISOString(),
    });

    await cacheService.set(cacheKey, { contenidos, timestamp: Date.now() });

    return {
      prompt: promptFinal,
      respuesta: respuestaGrok,
    };

  } catch (error) {
    logger.error("selen", "Error al ejecutar trigger:", error.message, error.stack);
    throw error;
  }
}