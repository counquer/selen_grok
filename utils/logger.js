const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "../logs");
const logFile = path.join(logDir, "combined.log");
const errorFile = path.join(logDir, "error.log");

function ensureLogDirExists() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Crear archivos vacíos si no existen
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, "", "utf8");
  }
  if (!fs.existsSync(errorFile)) {
    fs.writeFileSync(errorFile, "", "utf8");
  }
}

function timestamp() {
  return new Date().toISOString();
}

function writeToFile(filePath, message) {
  try {
    ensureLogDirExists();
    fs.appendFileSync(filePath, message + "\n", "utf8"); // Escritura síncrona para evitar pérdida de logs
  } catch (err) {
    console.error("⛔ Error escribiendo log:", err.message);
  }
}

function log(level, label, ...messageParts) {
  const labelTag = `[${label}]`;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] ${labelTag}`;
  const fullMessage = messageParts
    .map((m) => (typeof m === "object" ? JSON.stringify(m, null, 2) : m))
    .join(" ");
  const finalLine = `${prefix} ${fullMessage}`;

  // Mostrar en consola según el nivel
  if (level === "error") {
    console.error(finalLine);
    writeToFile(errorFile, finalLine);
  } else if (level === "debug") {
    console.debug(finalLine); // Usar console.debug para mensajes de depuración
  } else {
    console.log(finalLine);
  }

  // Escribir en combined.log para todos los niveles
  writeToFile(logFile, finalLine);
}

// Inicializar al cargar el módulo
ensureLogDirExists();

module.exports = {
  info: (label, ...msg) => log("info", label, ...msg),
  warn: (label, ...msg) => log("warn", label, ...msg),
  error: (label, ...msg) => log("error", label, ...msg),
  debug: (label, ...msg) => log("debug", label, ...msg) // Método debug añadido
};