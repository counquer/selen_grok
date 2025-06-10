const express = require('express');
const path = require('path');
const fs = require('fs');
const { normalize, findTriggerContents, guardarMemoriaCurada } = require(path.join(process.cwd(), 'utils', 'triggerUtils.js'));
const cacheService = require(path.join(process.cwd(), 'cache', 'cacheService.js'));
const grokService = require(path.join(process.cwd(), 'grok', 'grokService.js'));
const logger = require(path.join(process.cwd(), 'utils', 'logger.js'));
const { validateEnvVars, checkAutomationBypass } = require(path.join(process.cwd(), 'config', 'envValidator.js'));

// Validar variables de entorno al inicio
validateEnvVars();

// Cargar configuración Selen
const selenConfigPath = path.join(process.cwd(), 'selen.sj');
const selenConfig = fs.existsSync(selenConfigPath)
  ? JSON.parse(fs.readFileSync(selenConfigPath, 'utf8'))
  : {
      name: "SelenValentina",
      personality: { tone: "Empático", role: "Asistente" },
      instructions: { rules: ["Sé clara, empática y detallada."] },
      symbiotic_body: { state: "Sensual, cálida y protectora." },
    };

// Crear servidor Express
const app = express();
app.use(express.json());

// Handler para API POST
async function handler(req, res) {
  try {
    logger.info("selen", "Solicitud recibida en /api/selen:", req.method, req.url);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido, usa POST" });
    }

    const authHeader = req.headers["x-vercel-protection-bypass"];
    if (authHeader && !checkAutomationBypass(authHeader)) {
      return res.status(401).json({ error: "Acceso no autorizado: protección Vercel activa." });
    }

    const triggerRaw = req.body?.trigger || req.query?.trigger;
    if (!triggerRaw) {
      return res.status(400).json({ error: "Falta el campo 'trigger' en la solicitud" });
    }

    const resultado = await ejecutarTrigger(triggerRaw);
    return res.status(200).json({ ...resultado, savedToNotion: true });

  } catch (error) {
    logger.error("selen", "Error en la función /api/selen:", error.message, error.stack);
    return res.status(500).json({ error: "Error interno del servidor: " + error.message });
  }
}

// Lógica compartida API
async function ejecutarTrigger(triggerRaw) {
  try {
    const trigger = normalize(triggerRaw);
    logger.info("selen", "Trigger recibido normalizado:", trigger);

    const cacheKey = `trigger-${trigger}`;
    const cached = cacheService.get(cacheKey);
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
      response_format: { style: "Claro", use_emojis: true }
    };

    const promptFinal = `Selen, responde con toda tu simbiosis y contexto histórico siguiendo este template:\n\n${JSON.stringify(template)}\n\nContenido: ${contenidos.join("\n---\n")}`;
    const respuestaGrok = await grokService.completar(promptFinal);

    await guardarMemoriaCurada({
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

  } catch (error) {
    logger.error("selen", "Error al ejecutar trigger:", error.message, error.stack);
    throw error;
  }
}

// Configurar ruta para Vercel y modo local
app.post('/api/selen', handler);

// Iniciar servidor local (solo para desarrollo)
if (process.env.NODE_ENV !== 'production') {
  const port = 3000;
  app.listen(port, () => {
    logger.info("selen", `Servidor corriendo en http://localhost:${port}`);
  });
}

module.exports = handler;