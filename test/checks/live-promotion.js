// Controleert dat ontwikkel een PR-beoordeling toont, test de liveknop houdt en live niets toont.
module.exports = async function livePromotion({ assert, byIdMap }) {
  global.location = { pathname: "/dev/pr-130/" };
  window.__applyPromotionVisibility();
  assert(byIdMap["btn-live-overlay"].removed === true && byIdMap["review-actions"].children.length === 2 && byIdMap["review-actions"].children[0].href.endsWith("/pull/130") && byIdMap["review-actions"].children[1].href.endsWith("/pull/130/files"), "PR-ontwikkelomgeving toont twee acties voor het actuele PR");

  global.location = { pathname: "/dev/zonder-pr/" };
  window.__applyPromotionVisibility();
  assert(byIdMap["review-actions"].children.length === 0, "ontwikkelomgeving zonder PR-nummer toont geen kapotte beoordelingslink");

  global.location = { pathname: "/test/" };
  byIdMap["btn-live-overlay"].removed = false;
  byIdMap["live-promotion-overlay"].removed = false;
  assert(window.__applyPromotionVisibility() === true && byIdMap["btn-live-overlay"].removed !== true && typeof byIdMap["btn-live-overlay"].onclick === "function", "Naar live zetten blijft beschikbaar op Test");

  global.location = { pathname: "/" };
  assert(window.__applyPromotionVisibility() === false && byIdMap["btn-live-overlay"].removed === true && byIdMap["live-promotion-overlay"].removed === true && byIdMap["review-actions"].children.length === 0, "live-pad toont geen van de drie beoordelings- of promotieknoppen");
};
