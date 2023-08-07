import { colors, emojis } from "./constants.js";
import { parseCommandLineArguments } from "./arguments.js";
import { splitXMLFile } from "./splitter.js";

async function main() {
  const { xmlFile, maxFileSize, outputFileName } = parseCommandLineArguments();

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

export { main };
