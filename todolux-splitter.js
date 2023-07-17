const fs = require('fs');
const path = require('path');

// Colores en la consola
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

// Emojis
const emojis = {
  info: 'ℹ️',
  error: '❌',
  success: '✅',
};

function splitXMLFile(xmlFile, maxFileSize, outputFileName) {
  const xmlContent = fs.readFileSync(xmlFile, 'utf8');
  const startIndex = xmlContent.indexOf('<T_NEW_CATALOG>');
  const endIndex = xmlContent.indexOf('</T_NEW_CATALOG>') + '</T_NEW_CATALOG>'.length;
  const commonTags = xmlContent.substring(0, startIndex + '<T_NEW_CATALOG>'.length);
  const productsSection = xmlContent.substring(startIndex, endIndex);

  // Buscar y dividir los productos
  const products = productsSection.match(/<PRODUCT(?:\s+mode="new")?>(.*?)<\/PRODUCT>/gs);

  const outputFiles = [];
  let fileIndex = 1;
  let currentFileSize = 0;
  let currentFileContent = '';

  const inputFileName = path.basename(xmlFile, path.extname(xmlFile));
  const fileNamePrefix = outputFileName ? outputFileName : `${inputFileName}-split`;

  for (const product of products) {
    const fullProduct = product.trim();

    const productSize = Buffer.byteLength(fullProduct, 'utf8');
    if (currentFileSize + productSize > maxFileSize) {
      const outputFile = `${fileNamePrefix}-${fileIndex}.xml`;
      const fileContent = `${commonTags}\n${currentFileContent}</T_NEW_CATALOG>\n</BMECAT>`;
      fs.writeFileSync(outputFile, fileContent);
      outputFiles.push(outputFile);
      fileIndex++;
      currentFileSize = 0;
      currentFileContent = '';
    }

    currentFileContent += `${fullProduct}\n`;
    currentFileSize += productSize;
  }

  if (currentFileContent !== '') {
    const outputFile = `${fileNamePrefix}-${fileIndex}.xml`;
    const fileContent = `${commonTags}\n${currentFileContent}</T_NEW_CATALOG>\n</BMECAT>`;
    fs.writeFileSync(outputFile, fileContent);
    outputFiles.push(outputFile);
  }

  return outputFiles;
}

// Obtener argumentos de la línea de comandos
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log(`${colors.cyan}${emojis.info} Uso: node todolux-spliter.js --input=archivo.xml [--size=] [--output=]${colors.reset}`);
  console.log('');
  console.log('Parámetros:');
  console.log(`${colors.yellow}  --input=archivo.xml   ${colors.reset}Ruta al archivo XML que se dividirá en archivos más pequeños.`);
  console.log(`${colors.yellow}  --size=               ${colors.reset}(Opcional) Tamaño máximo de cada archivo dividido en megabytes. Por defecto: 90MB.`);
  console.log(`${colors.yellow}  --output=             ${colors.reset}(Opcional) Nombre del archivo generado. Por defecto: <inputFileName>-split.`);
  process.exit(0);
}

let xmlFile = '';
let maxFileSize = 90 * 1024 * 1024; // 90 MB (en bytes)
let outputFileName = '';

// Verificar los parámetros
for (const arg of args) {
  if (arg.startsWith('--input=')) {
    xmlFile = arg.split('=')[1];
  } else if (arg.startsWith('--size=')) {
    const sizeInMB = parseInt(arg.split('=')[1]);
    if (!isNaN(sizeInMB)) {
      maxFileSize = sizeInMB * 1024 * 1024; // Convertir a bytes
    }
  } else if (arg.startsWith('--output=')) {
    outputFileName = arg.split('=')[1];
  }
}

if (!xmlFile) {
  console.error(`${colors.red}${emojis.error} Error: Debes especificar el archivo de entrada usando el parámetro --input=archivo.xml${colors.reset}`);
  process.exit(1);
}

const splitFiles = splitXMLFile(xmlFile, maxFileSize, outputFileName);

// Imprimir los archivos generados
console.log(`${colors.green}${emojis.success} Archivos generados:${colors.reset}`);
for (const file of splitFiles) {
  console.log(`- ${file}`);
}
