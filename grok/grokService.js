const fetch = require("node-fetch");

const GROK_API_KEY = process.env.GROK_API_KEY;

async function completar(prompt) {
  if (!GROK_API_KEY) {
    throw new Error("Falta la variable de entorno GROK_API_KEY.");
  }

  console.log("🔥 Enviando prompt a Grok:", prompt);

  const response = await fetch("https://api.x.ai/v1/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "grok-3",
      prompt,
      max_tokens: 512,
      temperature: 0.95
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.text?.trim() || "(sin respuesta)";
}

module.exports = {
  completar,
};