// config/envValidator.js

import dotenv from "dotenv";
dotenv.config();

/**
 * Valida que todas las variables de entorno requeridas estén presentes.
 */
export default function validateEnvVars() {
  const requiredVars = [
    "NOTION_API_KEY",
    "GROK_API_KEY",
    "VERCEL_AUTOMATION_BYPASS_SECRET"
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error("❌ Faltan variables de entorno:", missing.join(", "));
    process.exit(1);
  }
}

/**
 * Verifica si el header coincide con el token de bypass configurado.
 */
export function checkAutomationBypass(headerValue) {
  return headerValue === process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

/**
 * Detecta si el entorno actual es local o Vercel
 */
export const isLocal = process.env.VERCEL !== "1";
export const isVercel = process.env.VERCEL === "1";
