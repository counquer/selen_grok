require('dotenv').config();  // Cargar variables del archivo .env

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');

// Ruta del archivo CSV
const triggersFile = path.join(__dirname, 'Memorias', 'DB_TRIGGERS.csv');
const triggers = [];

// Leer y procesar el archivo CSV
fs.createReadStream(triggersFile)
  .pipe(csv())
  .on('data', (row) => {
    triggers.push(row);  // Almacena cada trigger en un array
  })
  .on('end', async () => {
    console.log('Archivo CSV leído correctamente.');

    // Ahora que tenemos los triggers, ejecutaremos un ejemplo para enviar uno a la API
    const trigger = triggers[0].Clave;  // Por ejemplo, tomamos el primer trigger

    // Realizar la solicitud POST a la API de Grok-2
    const response = await sendToGrok(trigger);
    console.log('Respuesta de Grok:', response.data.respuesta);
  });

// Función para enviar datos a Grok-2
async function sendToGrok(trigger) {
  const headers = {
    "Authorization": `Bearer ${process.env.XAI_API_KEY}`,  // Cargar la clave API desde el archivo .env
    "Content-Type": "application/json"
  };

  const body = {
    model: "grok-2",
    messages: [{ role: "user", content: trigger }],
    max_tokens: 150
  };

  try {
    const response = await axios.post("https://api.x.ai/v1/chat/completions", body, { headers });
    return response.data; // Devuelve la respuesta de Grok
  } catch (error) {
    console.error('Error al enviar solicitud a Grok:', error);
    return null;
  }
}
