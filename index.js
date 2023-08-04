const fs = require("node:fs");
const path = require("node:path");

// Colores en la consola
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

// Emojis
const emojis = {
  info: "ℹ️",
  error: "❌",
  success: "✅",
};

async function getFileSize(filePath) {
  const stats = await fs.promises.stat(filePath);
  return stats.size;
}

async function splitXMLFile(xmlFile, maxFileSize, outputFileName) {
  const inputFileName = path.basename(xmlFile, path.extname(xmlFile));
  const fileNamePrefix = outputFileName
    ? outputFileName
    : `${inputFileName}-split`;
  const outputFiles = [];

  const readStream = fs.createReadStream(xmlFile, {
    highWaterMark: maxFileSize,
    encoding: "utf8",
  });

  let currentFileSize = 0;
  let fileIndex = 1;
  let currentFileContent = ""; // Mover esta variable afuera de la función
  let firstLine = true; // Añadir una bandera para identificar la primera línea

  const writeNextFile = () => {
    if (currentFileContent === "") {
      return; // Evitar crear archivo vacío si no hay contenido
    }

    const outputFile = `${fileNamePrefix}-${fileIndex}.xml`;
    fs.writeFileSync(
      outputFile,
      `${currentFileContent}</T_NEW_CATALOG>\n</BMECAT>`
    );
    outputFiles.push(outputFile);
    currentFileContent = "";
    fileIndex++;
  };

  readStream.on("data", (chunk) => {
    const lines = chunk.split(/\r?\n/);

    for (const line of lines) {
      const productSize = Buffer.byteLength(line, "utf8") + 1; // Agregar 1 para considerar el salto de línea

      // Si el tamaño del producto supera el tamaño máximo, escribirlo en un archivo independiente
      if (productSize > maxFileSize) {
        writeNextFile();
        const outputFile = `${fileNamePrefix}-${fileIndex}.xml`;
        fs.writeFileSync(outputFile, `${line}\n</T_NEW_CATALOG>\n</BMECAT>`);
        outputFiles.push(outputFile);
        fileIndex++;
        continue;
      }

      // Si el producto es demasiado grande para el archivo actual, escribirlo en el siguiente archivo
      if (firstLine && productSize > maxFileSize - 30) {
        // Agregamos un margen de 30 bytes para asegurarnos de que la primera línea no exceda el tamaño máximo
        writeNextFile();
        firstLine = false;
      }

      if (currentFileSize + productSize > maxFileSize) {
        writeNextFile();
        currentFileSize = productSize;
      }

      currentFileContent += `${line}\n`;
      currentFileSize += productSize;
    }
  });

  readStream.on("end", () => {
    if (currentFileContent !== "") {
      writeNextFile();
    }

    console.log(
      `${colors.green}${emojis.success} División completada.${colors.reset}`
    );
  });

  return outputFiles;
}

async function main() {
  // Obtener argumentos de la línea de comandos
  const args = process.argv.slice(2);

  if (args.includes("--version")) {
    const packageJson = require("./package.json");
    const version = packageJson.version;
    console.log(`Version: ${version}`);
    return;
  }
  if (args.length === 0 || args.includes("--help")) {
    console.log(
      `${colors.cyan}${emojis.info} Uso: node todolux-spliter.js --input=archivo.xml [--size=] [--output=]${colors.reset}`
    );
    console.log("");
    console.log("Parámetros:");
    console.log(
      `${colors.yellow}  --input=archivo.xml   ${colors.reset}Ruta al archivo XML que se dividirá en archivos más pequeños.`
    );
    console.log(
      `${colors.yellow}  --size=               ${colors.reset}(Opcional) Tamaño máximo de cada archivo dividido en megabytes. Por defecto: 90MB.`
    );
    console.log(
      `${colors.yellow}  --output=             ${colors.reset}(Opcional) Nombre del archivo generado. Por defecto: <inputFileName>-split.`
    );
    console.log(
      `${colors.yellow}  --version             ${colors.reset}(Opcional) Versión del cli.`
    );
    process.exit(0);
  }

  let xmlFile = "";
  let maxFileSize = 90 * 1024 * 1024; // 90 MB (en bytes)
  let outputFileName = "";

  // Verificar los parámetros
  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      xmlFile = arg.split("=")[1];
    } else if (arg.startsWith("--size=")) {
      const sizeInMB = parseInt(arg.split("=")[1]);
      if (!isNaN(sizeInMB)) {
        maxFileSize = sizeInMB * 1024 * 1024; // Convertir a bytes
      }
    } else if (arg.startsWith("--output=")) {
      outputFileName = arg.split("=")[1];
    }
  }

  if (!xmlFile) {
    console.error(
      `${colors.red}${emojis.error} Error: Debes especificar el archivo de entrada usando el parámetro --input=archivo.xml${colors.reset}`
    );
    process.exit(1);
  }

  // Dividir el archivo XML
  const splitFiles = await splitXMLFile(xmlFile, maxFileSize, outputFileName);

  // Imprimir los archivos generados
  console.log(
    `${colors.green}${emojis.success} Archivos generados:${colors.reset}`
  );
  for (const file of splitFiles) {
    console.log(`- ${file}`);
  }
}

main();
