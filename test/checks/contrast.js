// Controleer dat de vaste tekst-/achtergrondparen van de omgevingsbalk leesbaar blijven.
const fs = require("fs");
const path = require("path");

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function ratio(background, foreground) {
  const first = luminance(background);
  const second = luminance(foreground);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

module.exports = async function contrast({ assert }) {
  const html = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");
  ["dev", "test", "live"].forEach(environment => {
    const pairs = [...html.matchAll(new RegExp(`--env-${environment}-bg:\\s*(#[0-9a-f]{6}).*?--env-${environment}-ink:\\s*(#[0-9a-f]{6})`, "g"))];
    assert(pairs.length >= 2 && pairs.every(([, background, foreground]) => ratio(background, foreground) >= 4.5), `${environment} heeft in lichte en donkere weergave minimaal WCAG AA-contrast`);
  });
};
