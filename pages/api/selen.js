// pages/api/selen.js
const { promisify } = require('util');
const readFileAsync = promisify(require('fs').readFile);
const path = require('path');
const { normalize } = require('../../utils/triggerUtils.js');
const { findTriggerContents, guardarMemoriaCurada } = require('../../notion/notionService.js');
const cacheService = require('../../cache/cacheService.js');
const grokService = require('../../grok/grokService.js');
const logger = require('../../utils/logger.js');
const { validateEnvVars, checkAutomationBypass } = require('../../config/envValidator.js');

let selenConfig;
let configLoaded = false;

async function loadConfig() {
  if (configLoaded) return selenConfig;
  try {
    const selenConfigPath = path.join(process.cwd(), 'selen.json');
    selenConfig = JSON.parse(await readFileAsync(selenConfigPath, 'utf8'));
  } catch (error) {
    logger.error("selen", "Error en selen.json:", error.message);
    selenConfig = { name: "SelenValentina", personality: { tone: "Empático", role: "Asistente" }, instructions: { rules: ["Sé clara, empática y detallada."] }, symbiotic_body: { state: "Sensual, cálida y protectora." } };
  }
  if (!['name', 'personality', 'instructions', 'symbiotic_body'].every(f => selenConfig[f])) throw new Error("Config incompleta");
  configLoaded = true;
  return selenConfig;
}

async function optimizedFindTriggerContents(trigger) {
  const cacheKey = `notion-${trigger}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;
  const contents = await findTriggerContents(trigger);
  if (contents?.length) await cacheService.set(cacheKey, contents);
  return contents;
}

try { validateEnvVars(); } catch (error) { logger.error("selen", "Entorno:", error.message); throw error; }

module.exports = async (req, res) => {
  try {
    logger.info("selen", "Solicitud:", { method: req.method, url: req.url });
    if (req.method !== "POST") return res.status(405).json({ error: "Usa POST" });
    if (req.headers["x-vercel-protection-bypass"] && !checkAutomationBypass(req.headers["x-vercel-protection-bypass"])) return res.status(401).json({ error: "Acceso denegado" });
    const trigger = req.body?.trigger || req.query?.trigger;
    if (!trigger || typeof trigger !== 'string' || trigger.length > 1000) return res.status(400).json({ error: "Trigger inválido" });

    await loadConfig();
    const result = await ejecutarTrigger(trigger);
    res.status(200).json({ status: 'success', data: { ...result, savedToNotion: true } });
  } catch (error) {
    logger.error("selen", "Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

async function ejecutarTrigger(trigger) {
  const cacheKey = `trigger-${trigger}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const contents = await optimizedFindTriggerContents(trigger);
  if (!contents?.length) throw new Error("No memorias");

  const template = {
    name: selenConfig.name, personality: selenConfig.personality,
    instructions: selenConfig.instructions, symbiotic_body: selenConfig.symbiotic_body,
    memory: { interaction_history: contents.join("\n---\n") },
    response_format: { style: "Claro", use_emojis: true },
  };

  const prompt = `Selen, responde:\n${JSON.stringify(template)}\n${contents.join("\n---\n")}`;
  const response = await grokService.completar(prompt, { maxTokens: 300, temperature: 0.8 });

  await guardarMemoriaCurada({
    clave: trigger, seccion: "general", contenido: response, prioridad: "alta",
    estado: "activo", categoria_emocional: "neutral", etiquetas: ["automático", "grok"],
    timestamp: new Date().toISOString(),
  });

  await cacheService.set(cacheKey, { contents, timestamp: Date.now() });
  return { prompt, respuesta: response };
}