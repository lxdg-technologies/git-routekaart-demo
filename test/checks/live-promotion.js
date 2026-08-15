// Controleert dat ontwikkel een PR-beoordeling toont, test de liveknop houdt en live niets toont.
module.exports = async function livePromotion({ assert, byIdMap }) {
  global.location = { pathname: "/dev/pr-130/" };
  window.__applyPromotionVisibility();
  assert(byIdMap["btn-live-overlay"].removed === true && typeof byIdMap["btn-review-approve"].onclick === "function" && typeof byIdMap["btn-review-reject"].onclick === "function", "PR-ontwikkelomgeving koppelt de twee balkknoppen aan de uitleg");

  global.location = { pathname: "/dev/zonder-pr/" };
  window.__applyPromotionVisibility();
  assert(byIdMap["review-guide"].hidden === true, "ontwikkelomgeving zonder PR-nummer opent geen uitleg zonder geldige PR");

  global.location = { pathname: "/test/" };
  byIdMap["btn-live-overlay"].removed = false;
  byIdMap["live-promotion-overlay"].removed = false;
  assert(window.__applyPromotionVisibility() === true && byIdMap["btn-live-overlay"].removed !== true && typeof byIdMap["btn-live-overlay"].onclick === "function", "Naar live zetten blijft beschikbaar op Test");

  global.location = { pathname: "/" };
  assert(window.__applyPromotionVisibility() === false && byIdMap["btn-live-overlay"].removed === true && byIdMap["live-promotion-overlay"].removed === true && byIdMap["review-guide"].hidden === true, "live-pad toont geen van de drie beoordelings- of promotieknoppen");
};
