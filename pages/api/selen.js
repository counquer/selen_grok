const fs = require('fs');
const validateEnvVars = require('../config/envValidator.js');
const { normalize } = require('../utils/triggerUtils.js');
const notionService = require('../notion/notionService.js');
const grokService = require('../grok/grokService.js');
const cacheService = require('../cache/cacheService.js');
const logger = require('../utils/logger.js');

// Cargar selen.sj
const selenConfig = fs.existsSync('selen.sj')
  ? JSON.parse(fs.readFileSync('selen.sj', 'utf8'))
  : { name: "SelenValentina", personality: { tone: "Empático", role: "Asistente" } };

// Validar variables de entorno al inicio
validateEnvVars();

module.exports = async function handler(req, res) {
  logger.info("selen", "Solicitud recibida en /api/selen:", req.method, req.url);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido, usa POST" });
  }

  const authHeader = req.headers["x-vercel-protection-bypass"];
  if (authHeader && !validateEnvVars.checkAutomationBypass(authHeader)) {
    return res.status(401).json({ error: "Acceso no autorizado: protección Vercel activa." });
  }

  try {
    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (!triggerRaw) {
      return res.status(400).json({ error: "Falta el campo 'trigger' en la solicitud" });
    }

    const resultado = await ejecutarTrigger(triggerRaw);
    return res.status(200).json({ ...resultado, savedToNotion: true });

  } catch (error) {
    logger.error("selen", "Error en la función /api/selen:", error.message);
    return res.status(500).json({ error: "Error interno del servidor: " + error.message });
  }
};

// Lógica compartida API
async function ejecutarTrigger(triggerRaw) {
  const trigger = normalize(triggerRaw);
  logger.info("selen", "Trigger recibido normalizado:", trigger);

  const cacheKey = `trigger-${trigger.trim().toLowerCase()}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.info("selen", "Respondiendo desde caché");
    return { ...cached, fromCache: true };
  }

  const contenidos = await notionService.findTriggerContents(trigger);
  if (!contenidos || contenidos.length === 0) {
    throw new Error("No se encontraron memorias con la clave proporcionada.");
  }

  // Template con selenConfig
  const template = {
    name: selenConfig.name || "SelenValentina",
    personality: selenConfig.personality || { tone: "Empático, dinámico", role: "Asistente simbiótico" },
    instructions: selenConfig.instructions || { rules: ["Responde con empatía", "Integra contexto histórico"] },
    symbiotic_body: selenConfig.symbiotic_body || { state: "Refleja emociones del trigger" },
    memory: { interaction_history: contenidos.join("\n---\n") },
    response_format: { style: "Claro", use_emojis: true }
  };

  const promptFinal = `Selen, responde con toda tu simbiosis y contexto histórico siguiendo este template:\n\n${JSON.stringify(template)}\n\nContenido: ${contenidos.join("\n---\n")}`;
  const respuestaGrok = await grokService.completar(promptFinal);

  await notionService.guardarMemoriaCurada({
    clave: trigger,
    seccion: "general",
    contenido: respuestaGrok,
    timestamp: new Date().toISOString(),
  });

  cacheService.set(cacheKey, { contenidos, timestamp: Date.now() });

  return {
    prompt: promptFinal,
    respuesta: respuestaGrok
  };
}