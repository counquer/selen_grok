function normalize(texto) { 
  if (typeof texto !== "string") return ""; 
  return texto.trim().toLowerCase(); 
} 
module.exports = { normalize }; 
