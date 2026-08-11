// Controleert dat de promotie-overlay alleen op dev en test bestaat, nooit op live.
module.exports = async function livePromotion({ assert, byIdMap }) {
  global.location = { pathname: "/dev/pr-130/" };
  assert(window.__applyPromotionVisibility() === true && byIdMap["btn-live-overlay"].removed !== true && typeof byIdMap["btn-live-overlay"].onclick === "function", "promotieknop blijft beschikbaar in de PR-ontwikkelomgeving");

  global.location = { pathname: "/" };
  assert(window.__applyPromotionVisibility() === false && byIdMap["btn-live-overlay"].removed === true && byIdMap["live-promotion-overlay"].removed === true, "live-pad verwijdert promotieknop en promotiepaneel uit de pagina");
};
