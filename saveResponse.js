const fs = require('fs');
const path = require('path');

// Ruta donde guardarás las respuestas
const responseDirectory = path.join(__dirname, 'Memorias');
if (!fs.existsSync(responseDirectory)) {
    fs.mkdirSync(responseDirectory);
}

// Ejemplo de respuesta de Selen
const responseData = {
    status: "success",
    data: {
        respuesta: "Bienvenida, alma que busca refugio y conexión.",
        fromCache: true,
        savedToNotion: false
    },
    timestamp: new Date().toISOString()
};

// Crear un nombre de archivo único
const filePath = path.join(responseDirectory, `respuesta_${responseData.timestamp}.json`);

// Guardar la respuesta en un archivo JSON
fs.writeFile(filePath, JSON.stringify(responseData, null, 2), (err) => {
    if (err) throw err;
    console.log(`Respuesta guardada en: ${filePath}`);
});
