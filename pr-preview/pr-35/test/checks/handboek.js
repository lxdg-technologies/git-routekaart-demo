// Handboek-controle: WERKWIJZE.md moet elke missie dekken.
const fs = require("fs");
const path = require("path");

module.exports = async function handboek({ assert, byIdMap }) {
  const werkwijze = fs.readFileSync(path.join(__dirname, "..", "..", "WERKWIJZE.md"), "utf8");
  const regelsOpAf = (werkwijze.match(/^\|.*\|\s*af\s*\|\s*$/gm) || []).length;
  const missiesInSimulatie = byIdMap["missie-list"].children.length;
  assert(missiesInSimulatie === regelsOpAf,
    `WERKWIJZE.md is bijgewerkt: ${missiesInSimulatie} missies in de simulatie, ${regelsOpAf} regels op 'af' in het handboek`);
};
