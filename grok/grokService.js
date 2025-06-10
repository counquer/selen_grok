const fetch = require('node-fetch'); 
const path = require('path'); 
const logger = require(path.resolve(__dirname, '../utils/logger.js')); 
const GROK_API_KEY = process.env.GROK_API_KEY; 
async function completar(prompt, options = {}) { 
  try { 
    if (!GROK_API_KEY) { logger.error("grok", "Falta GROK_API_KEY."); throw new Error("Falta GROK_API_KEY."); } 
