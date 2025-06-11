const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Normaliza cualquier texto para búsqueda insensible a mayúsculas y espacios
function normalize(texto) {
  if (typeof texto !== "string") return "";
  return texto.trim().toLowerCase();
}

// Busca un trigger específico desde el CSV directamente, ideal para pruebas externas
function getTriggerByKey(triggerClave, callback) {
  const results = [];
  const filePath = path.join(__dirname, "../Memorias/DB_TRIGGERS.csv"); // Ruta estándar

  fs.createReadStream(filePath)
    .pipe(csv({ separator: ',' }))
    .on("data", (row) => {
      if (normalize(row.Clave) === normalize(triggerClave)) {
        results.push(row);
      }
    })
    .on("end", () => {
      if (results.length > 0) {
        callback(null, results); // Devuelve todos los match
      } else {
        callback(new Error(`Trigger "${triggerClave}" no encontrado en CSV.`), []);
      }
    })
    .on("error", (err) => {
      callback(new Error(`Error al leer el archivo CSV: ${err.message}`), []);
    });
}

module.exports = {
  normalize,
  getTriggerByKey
};
