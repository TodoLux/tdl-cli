// src/splitter.js

import fs from "node:fs";
import path from "node:path";
import { colors, emojis } from "./constants.js";

async function getFileSize(filePath) {
  const stats = await fs.promises.stat(filePath);
  return stats.size;
}

async function readHeader(xmlFile) {
  const readStream = fs.createReadStream(xmlFile, {
    highWaterMark: 5 * 1024 * 1024, // Leer solo los primeros 5 MiB para obtener el header
    encoding: "utf8",
  });

  return new Promise((resolve, reject) => {
    let header = "";

    readStream.on("data", (chunk) => {
      header += chunk;

      // Buscar el índice de la etiqueta <T_NEW_CATALOG>
      const headerEndIndex = header.indexOf("<T_NEW_CATALOG>");

      if (headerEndIndex !== -1) {
        // Encontramos el header completo, detener la lectura y resolver la promesa
        readStream.destroy();
        resolve(header.slice(0, headerEndIndex + "<T_NEW_CATALOG>".length));
      }
    });

    readStream.on("end", () => {
      // No se encontró el header completo, rechazar la promesa con un error
      reject(
        new Error(
          "El archivo XML no contiene el header completo (<T_NEW_CATALOG>)"
        )
      );
    });

    readStream.on("error", (error) => {
      reject(error);
    });
  });
}

async function splitXMLFile(xmlFile, outputFileName) {
  const inputFileName = path.basename(xmlFile, path.extname(xmlFile));
  const fileNamePrefix = outputFileName
    ? outputFileName
    : `${inputFileName}-split`;
  const outputFiles = [];

  let header;
  try {
    header = await readHeader(xmlFile);
  } catch (error) {
    console.error(
      `${colors.red}${emojis.error} Error: ${error.message}${colors.reset}`
    );
    process.exit(1);
  }

  const readStream = fs.createReadStream(xmlFile, {
    highWaterMark: 200 * 1024 * 1024, // Leer solo los primeros 200 MiB para obtener el header
    encoding: "utf8",
    start: header.length, // Saltar el header al leer el archivo
  });

  let currentCatalog = header;
  let currentProduct = "";
  let currentFileSize = Buffer.byteLength(header, "utf8");
  let fileIndex = 1;

  const writeNextFile = async () => {
    const outputFile = `${fileNamePrefix}-${fileIndex}.xml`;

    try {
      await fs.promises.writeFile(
        outputFile,
        `${currentCatalog}${currentProduct}</T_NEW_CATALOG>\n</BMECAT>`
      );
      outputFiles.push(outputFile);
      currentProduct = "";
      currentFileSize = Buffer.byteLength(header, "utf8");
      fileIndex++;
    } catch (error) {
      console.error(
        `${colors.red}${emojis.error} Error al escribir el archivo: ${error.message}${colors.reset}`
      );
    }
  };

  readStream.on("data", async (chunk) => {
    const lines = chunk.split(/\r?\n/);

    for (const line of lines) {
      if (line.includes("<T_NEW_CATALOG>")) {
        // Saltar la etiqueta <T_NEW_CATALOG> ya que ya tenemos el header completo
        continue;
      }

      if (line.includes('<PRODUCT mode="new">')) {
        // Comenzamos un nuevo producto
        currentProduct = `${line}\n`;
        currentFileSize += Buffer.byteLength(line, "utf8") + 1;
      } else if (line.includes("</PRODUCT>")) {
        // Hemos completado el producto, agregar la línea al producto actual y escribirlo en el archivo si es necesario
        currentProduct += `${line}\n`;
        currentFileSize += Buffer.byteLength(line, "utf8") + 1;

        if (currentFileSize > 90 * 1024 * 1024) {
          // El archivo actual excede el tamaño máximo, escribirlo y reiniciar el contenido
          await writeNextFile();
          currentCatalog = header;
        }
      } else {
        // Estamos dentro de un producto, agregar la línea al producto actual
        currentProduct += `${line}\n`;
        currentFileSize += Buffer.byteLength(line, "utf8") + 1;
      }
    }
  });

  readStream.on("end", async () => {
    if (currentProduct !== "") {
      // Si quedan productos por escribir, escribir el último archivo
      await writeNextFile();
    }

    console.log(
      `${colors.green}${emojis.success} División completada.${colors.reset}`
    );
  });

  return outputFiles;
}

export { splitXMLFile };
