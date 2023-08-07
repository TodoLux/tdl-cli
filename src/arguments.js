import { createRequire } from "module";
const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

function parseCommandLineArguments() {
  const args = process.argv.slice(2);

  if (args.includes("--version")) {
    const version = packageJson.version;
    console.log(`Version: ${version}`);
    process.exit(0);
  }

  if (args.length === 0 || args.includes("--help")) {
    console.log(
      `${colors.cyan}${emojis.info} Uso: node index.js --input=archivo.xml [--size=] [--output=]${colors.reset}`
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

  return { xmlFile, maxFileSize, outputFileName };
}

export { parseCommandLineArguments };
