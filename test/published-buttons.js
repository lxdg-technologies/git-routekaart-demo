#!/usr/bin/env node
const assert = require("assert");
const { controleerKnoppen, requestModule } = require("../.github/scripts/controleer-gepubliceerde-knoppen.js");

assert.strictEqual(requestModule("https://example.com"), require("https"));
assert.strictEqual(requestModule("http://127.0.0.1:9231/json/list"), require("http"));
assert.throws(() => requestModule("ftp://example.com"), /Niet-ondersteund URL-protocol/);

function check(environment, buttons, expected) {
  assert.deepStrictEqual(controleerKnoppen(environment, buttons), expected);
}

check("live", [], []);
check("test", [{ id: "btn-live-overlay" }], []);
check("ontwikkel", [{ id: "btn-review-approve" }, { id: "btn-review-reject" }], []);

const wrong = controleerKnoppen("live", [{ id: "btn-live-overlay" }]);
assert.strictEqual(wrong.length, 1);
assert.match(wrong[0], /live: verkeerde knop/);

const missing = controleerKnoppen("test", []);
assert.strictEqual(missing.length, 1);
assert.match(missing[0], /test: knop btn-live-overlay staat 0 keer/);

console.log("ALLE GEPUBLICEERDE-KNOPPEN-TESTS GESLAAGD");