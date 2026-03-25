const fs = require('fs');
const path = require('path');

// pdf-parse@2.x is pure ESM (broken in Node CJS), use v1.1.1 which ships proper CJS.
// We resolve via pnpm's content-addressable store to guarantee v1 is loaded.
const pdfParsePath = path.join(
  __dirname, '..', '..', 'node_modules', '.pnpm',
  'pdf-parse@1.1.1', 'node_modules', 'pdf-parse'
);
const pdfParse = require(pdfParsePath);

async function extract() {
  try {
    const filepath = process.argv[2];
    if (!filepath) throw new Error("No filepath provided to worker.");

    const buffer = fs.readFileSync(filepath);
    const data = await pdfParse(buffer);

    process.stdout.write(data.text);
    process.exit(0);
  } catch (error) {
    process.stderr.write(String(error));
    process.exit(1);
  }
}

extract();
