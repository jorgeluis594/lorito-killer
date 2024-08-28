const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Función para procesar el archivo SQL y convertirlo a CSV
function sqlToCsv(sqlFilePath, csvFilePath) {
  // Leer el contenido del archivo SQL
  const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

  // Expresión regular para encontrar los valores entre paréntesis
  const pattern = /(?<=\()[^()]+(?=\))/g;
  const matches = sqlContent.match(pattern);

  // Crear las filas del CSV
  const rows = matches.map((match) => {
    // Eliminar paréntesis
    const values = match.split(/, '(?=\d*'?)|, (?=\d+)/);

    // Quitar las comillas simples de los valores
    const parts = values.map((value) => value.trim().replace("'", ""));

    // Desestructurar los valores según el modelo
    let [idUbigeo, name, code, tag, searchValue, , level, parentId] = parts;

    // Generar un UUID para el campo `id`
    const id = uuidv4();

    // Ajustar `parentId` para que sea null si es 0
    parentId = parentId === "0" ? "" : parentId;
    // Retornar la fila como un arreglo de valores
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
    path: "localities.csv",
    header: headers,
  });

  csvWriter.writeRecords(rows).then(() => {
    console.log("CSV file created successfully");
  });
}

// Ruta del archivo SQL de entrada y archivo CSV de salida
const sqlFilePath = "ubigeo.sql"; // Cambia esta ruta por la ruta de tu archivo
const csvFilePath = "locality.csv"; // Cambia esta ruta por la ruta donde deseas guardar el CSV

// Convertir el archivo SQL a CSV
sqlToCsv(sqlFilePath, csvFilePath);
