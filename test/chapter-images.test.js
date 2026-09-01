const test = require("node:test");
const assert = require("node:assert/strict");
const cheerio = require("cheerio");

const {
  extractChapterImages,
  hasCompleteImageSet,
} = require("../controllers/bacaChapterController");
const {
  getChapterImageFallbackUrl,
  isAllowedChapterImageUrl,
} = require("../controllers/scraperUtils");

test("chapter image allowlist accepts current Komiku delivery hosts only", () => {
  assert.equal(
    isAllowedChapterImageUrl("https://img.komiku.org/upload5/series/176/1.webp"),
    true
  );
  assert.equal(
    isAllowedChapterImageUrl("https://cdn.komiku.org/upload5/series/176/1.webp"),
    true
  );
  assert.equal(
    isAllowedChapterImageUrl("https://image2.komiku.to/upload5/series/176/1.webp"),
    true
  );
  assert.equal(
    isAllowedChapterImageUrl("https://image10.komiku.to/upload5/series/176/9.webp"),
    true
  );
  assert.equal(
    isAllowedChapterImageUrl("https://image2.komiku.to/wp-content/uploads/787916-1.jpg"),
    true
  );
  assert.equal(
    isAllowedChapterImageUrl("https://image7.komiku.to/wp-content/uploads/2271851-23.jpg"),
    true
  );
  assert.equal(
    isAllowedChapterImageUrl("https://thumbnail.komiku.to/upload5/series/176/1.webp"),
    false
  );
  assert.equal(
    isAllowedChapterImageUrl("https://image2.komiku.to.evil.invalid/upload5/series/176/1.webp"),
    false
  );
  assert.equal(
    isAllowedChapterImageUrl("https://image2.komiku.to.evil.invalid/wp-content/uploads/787916-1.jpg"),
    false
  );
  assert.equal(
    isAllowedChapterImageUrl("http://img.komiku.org/upload5/series/176/1.webp"),
    false
  );
  assert.equal(
    isAllowedChapterImageUrl("https://img.komiku.org/wp-content/other/page.jpg"),
    false
  );
});

test("chapter image fallback keeps the path on img.komiku.org", () => {
  assert.equal(
    getChapterImageFallbackUrl(
      "https://image7.komiku.to/upload5/series/176/6.webp?quality=90"
    ),
    "https://img.komiku.org/upload5/series/176/6.webp?quality=90"
  );
});

test("chapter parser returns all 15 mixed-host images in numeric order", () => {
  const tags = [];
  for (let id = 15; id >= 1; id -= 1) {
    const host = id <= 9 ? `image${id + 1}.komiku.to` : "img.komiku.org";
    tags.push(
      `<img class="ww" id="${id}" src="https://${host}/upload5/series/176/${id}.webp" alt="Page ${id}">`
    );
  }
  tags.push(
    '<img class="ww" id="1" src="https://img.komiku.org/upload5/series/176/1.webp" alt="Duplicate page 1">'
  );
  const $ = cheerio.load(`<div id="Baca_Komik">${tags.join("")}</div>`);
  const images = extractChapterImages($);

  assert.equal(images.length, 15);
  assert.deepEqual(
    images.map((image) => image.id),
    Array.from({ length: 15 }, (_, index) => String(index + 1))
  );
  assert.equal(images[0].src.includes("image2.komiku.to"), true);
  assert.equal(images[0].fallbackSrc.includes("img.komiku.org"), true);
  assert.equal(hasCompleteImageSet(images, 15), true);
  assert.equal(hasCompleteImageSet(images.slice(9), 15), false);
});

test("duplicate chapter image tags never inflate the parsed page count", () => {
  const tags = [];
  for (let id = 1; id <= 15; id += 1) {
    const host = id <= 9 ? `image${id + 1}.komiku.to` : "img.komiku.org";
    tags.push(
      `<img class="ww" id="${id}" src="https://${host}/upload5/series/176/${id}.webp" alt="Page ${id}">`
    );
  }
  tags.push(
    '<img class="ww" id="1" src="https://img.komiku.org/upload5/series/176/1.webp" alt="Duplicate page 1">'
  );
  tags.push(
    '<img class="ww" id="15" src="https://cdn.komiku.org/upload5/series/176/15.webp" alt="Duplicate page 15">'
  );
  const $ = cheerio.load(`<div id="Baca_Komik">${tags.join("")}</div>`);
  const images = extractChapterImages($);

  assert.equal(images.length, 15);
  assert.deepEqual(
    images.map((image) => image.id),
    Array.from({ length: 15 }, (_, index) => String(index + 1))
  );
  assert.equal(hasCompleteImageSet(images, 15), true);
});
