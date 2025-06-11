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
  ensureLogDirExists();
  fs.appendFile(filePath, message + "\n", (err) => {
    if (err) console.error("⛔ Error escribiendo log:", err);
  });
}

function log(level, label, ...messageParts) {
  const labelTag = `[${label}]`;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] ${labelTag}`;
  const fullMessage = messageParts.map(m => typeof m === "object" ? JSON.stringify(m) : m).join(" ");
  const finalLine = `${prefix} ${fullMessage}`;

  if (level === "error") {
    console.error(finalLine);
    writeToFile(errorFile, finalLine);
  } else {
    console.log(finalLine);
  }

  writeToFile(logFile, finalLine);
}

// Inicializar al cargar el módulo
ensureLogDirExists();

module.exports = {
  info: (label, ...msg) => log("info", label, ...msg),
  warn: (label, ...msg) => log("warn", label, ...msg),
  error: (label, ...msg) => log("error", label, ...msg)
};
