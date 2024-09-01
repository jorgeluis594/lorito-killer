const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Función para procesar el archivo SQL y convertirlo a CSV
function sqlToCsv(sqlFilePath, csvFilePath) {
  // Leer el contenido del archivo SQL
  const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

  // Expresión regular para encontrar los valores entre paréntesis
  const pattern = /\(([^)]+)\)/g;
  const matches = [];
  let match;

  // Extraer los valores entre paréntesis
  while ((match = pattern.exec(sqlContent)) !== null) {
    matches.push(match[1]);
  }

  // Crear las filas del CSV
  const rows = matches.map((match) => {
    // Separar los valores por comas
    const values = match.split(/,\s*(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/);

    // Limpiar y estructurar los valores
    const parts = values.map((value) => value.trim().replace(/^'|'$/g, "").replace(/""/g, '"'));

    // Desestructurar los valores según el modelo
    let [idUbigeo, name, code, tag, searchValue, , level, parentId] = parts;

    // Generar un UUID para el campo `id`
    const id = uuidv4();

    // Ajustar `parentId` para que sea null si es 0
    parentId = parentId === "0" ? "" : parentId;

    // Retornar la fila como un objeto
    return { id, idUbigeo, name, code, tag, searchValue, level, parentId };
  });

  // Definir los nombres de las columnas según el modelo Locality
  const headers = [
    { id: "id", title: "id" },
    { id: "idUbigeo", title: "idUbigeo" },
    { id: "name", title: "name" },
    { id: "code", title: "code" },
    { id: "tag", title: "tag" },
    { id: "searchValue", title: "searchValue" },
    { id: "level", title: "level" },
    { id: "parentId", title: "parentId" },
  ];

  // Crear el contenido del archivo CSV
  const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: headers,
    fieldDelimiter: ',', // Especifica el delimitador de campos como una coma
    alwaysQuote: false, // No poner comillas alrededor de los valores de campo
  });

  csvWriter.writeRecords(rows).then(() => {
    console.log("CSV file has been written.");
    addQuotesToWordsExceptId(csvFilePath);
  });
}

// Función para agregar comillas alrededor de palabras en el archivo CSV, excepto el campo `id`
function addQuotesToWordsExceptId(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) throw err;

    // Dividir el contenido en líneas
    const lines = data.split('\n');

    // Procesar la primera línea (cabeceras) para asegurarse de no modificar los nombres de columnas
    const headers = lines[0].split(',');
    const headerIndices = {};
    headers.forEach((header, index) => headerIndices[header.trim()] = index);

    // Procesar cada línea
    const updatedLines = lines.map((line, lineIndex) => {
      if (lineIndex === 0) return line; // No modificar la primera línea (cabeceras)

      // Dividir la línea en campos
      const fields = line.split(/,(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/);

      // Agregar comillas alrededor de los campos que son palabras (contienen letras), excepto `id`
      const quotedFields = fields.map((field, index) => {
        const trimmedField = field.trim();
        if (headers[index] !== 'id' && /^[a-zA-Z]/.test(trimmedField) && trimmedField !== '') {
          // Manejar casos con comillas dobles dentro del campo
          return `"${trimmedField.replace(/"/g, '""')}"`;
        }
        return trimmedField;
      });

      // Unir los campos actualizados en una sola línea
      return quotedFields.join(',');
    });

    // Unir las líneas actualizadas en una sola cadena
    const updatedData = updatedLines.join('\n');

    // Escribir el contenido actualizado de nuevo al archivo CSV
    fs.writeFile(filePath, updatedData, 'utf8', (err) => {
      if (err) throw err;
      console.log("CSV file updated with quotes around words except 'id'");
    });
  });
}

// Ruta del archivo SQL de entrada y archivo CSV de salida
const sqlFilePath = "ubigeo.sql"; // Cambia esta ruta por la ruta de tu archivo
const csvFilePath = "localities.csv"; // Cambia esta ruta por la ruta donde deseas guardar el CSV

// Convertir el archivo SQL a CSV
sqlToCsv(sqlFilePath, csvFilePath);
