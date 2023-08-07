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

async function splitXMLFile(xmlFile, maxFileSize, outputFileName) {
  const inputFileName = path.basename(xmlFile, path.extname(xmlFile));
  const fileNamePrefix = outputFileName
    ? outputFileName
    : `${inputFileName}-split`;
  const outputFiles = [];

  const fileContent = fs.readFileSync(xmlFile, "utf8");
  const headerEndIndex = fileContent.indexOf("<T_NEW_CATALOG>");

  if (headerEndIndex === -1) {
    console.error(
      `${colors.red}${emojis.error} Error: El archivo XML no contiene la etiqueta <T_NEW_CATALOG>${colors.reset}`
    );
    process.exit(1);
  }

  const header = fileContent.slice(
    0,
    headerEndIndex + "<T_NEW_CATALOG>".length
  );
  const footer = "\n</T_NEW_CATALOG>\n</BMECAT>";
  const productsContent = fileContent.slice(
    headerEndIndex + "<T_NEW_CATALOG>".length
  );

  let currentCatalog = header;
  let currentProduct = "";
  let currentFileSize = Buffer.byteLength(header, "utf8");

  const writeNextFile = (isLastFile) => {
    if (currentProduct === "") {
      return; // Evitar crear archivo vacío si no hay contenido
    }

    const outputFile = `${fileNamePrefix}-${outputFiles.length + 1}.xml`;
    const outputContent = isLastFile
      ? currentCatalog + currentProduct
      : currentCatalog + currentProduct + footer;

    fs.writeFileSync(outputFile, outputContent);
    outputFiles.push(outputFile);

    currentProduct = "";
    currentFileSize = Buffer.byteLength(header, "utf8");
  };

  const products = productsContent.split("</PRODUCT>");

  for (let i = 0; i < products.length - 1; i++) {
    const productWithEndTag = products[i] + "</PRODUCT>";
    const productSize = Buffer.byteLength(productWithEndTag, "utf8");

    if (
      currentFileSize + productSize + Buffer.byteLength(footer, "utf8") >
      maxFileSize
    ) {
      writeNextFile(false);
      currentCatalog = header;
    }

    currentProduct += productWithEndTag;
    currentFileSize += productSize;
  }

  const lastProduct = products[products.length - 1];
  const lastProductWithEndTag = lastProduct;
  const lastProductSize = Buffer.byteLength(lastProductWithEndTag, "utf8");

  if (currentFileSize + lastProductSize > maxFileSize) {
    writeNextFile(false);
    currentCatalog = header;
  }

  currentProduct += lastProductWithEndTag;
  currentFileSize += lastProductSize;
  writeNextFile(true);

  console.log(
    `${colors.green}${emojis.success} División completada.${colors.reset}`
  );

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
      `${colors.cyan}${emojis.info} Uso: tdl-cli --input=archivo.xml [--size=] [--output=]${colors.reset}`
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
