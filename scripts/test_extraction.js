
// Mock DOM Element
class MockElement {
    constructor(tagName, text = '') {
        this.tagName = tagName;
        this.innerText = text;
        this.nextElementSibling = null;
        this.textContent = text;
    }
}

// Helper to chain elements
function chain(elements) {
    for (let i = 0; i < elements.length - 1; i++) {
        elements[i].nextElementSibling = elements[i + 1];
    }
    return elements;
}

// Create a mock document structure
// H2 (Start) -> P -> H3 (Sub) -> P -> H3 (Sub) -> P -> H2 (End boundary)
const h2_start = new MockElement('H2', 'Main Topic');
const p1 = new MockElement('P', 'Introduction to main topic.');
const h3_1 = new MockElement('H3', 'Sub-topic 1');
const p2 = new MockElement('P', 'Details about sub-topic 1.');
const h3_2 = new MockElement('H3', 'Sub-topic 2');
const p3 = new MockElement('P', 'Details about sub-topic 2.');
const h2_next = new MockElement('H2', 'Next Main Topic');
const p4 = new MockElement('P', 'Should NOT be included.');

// Chain them
chain([h2_start, p1, h3_1, p2, h3_2, p3, h2_next, p4]);

// Logic under test (copied from index.ts)
function extractContent(header) {
    let context = `\n### ${header.textContent}\n`;

    const startLevel = parseInt(header.tagName.replace('H', '')) || 6;

    let sibling = header.nextElementSibling;
    while (sibling) {
        const tagName = sibling.tagName;
        if (/^H[1-6]$/.test(tagName)) {
            const currentLevel = parseInt(tagName.replace('H', ''));
            if (currentLevel <= startLevel) break;
        }
        context += (sibling.innerText || '') + ' ';
        sibling = sibling.nextElementSibling;
    }
    return context;
}

// Run test
const extracted = extractContent(h2_start);

console.log("--- Extracted Content ---");
console.log(extracted);
console.log("-------------------------");

// Assertions
if (!extracted.includes('Introduction to main topic')) console.error("FAIL: Missing p1");
else if (!extracted.includes('Sub-topic 1')) console.error("FAIL: Missing h3_1");
else if (!extracted.includes('Details about sub-topic 1')) console.error("FAIL: Missing p2");
else if (!extracted.includes('Sub-topic 2')) console.error("FAIL: Missing h3_2");
else if (!extracted.includes('Details about sub-topic 2')) console.error("FAIL: Missing p3");
else if (extracted.includes('Next Main Topic')) console.error("FAIL: Included next H2 header");
else if (extracted.includes('Should NOT be included')) console.error("FAIL: Included content after next H2");
else console.log("SUCCESS: Algorithm correctly extracted all subsections and stopped at next H2.");
