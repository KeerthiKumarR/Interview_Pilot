import fs from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function main() {
  const filePath = process.argv[2];
  let buffer;

  if (filePath && fs.existsSync(filePath)) {
    buffer = fs.readFileSync(filePath);
  } else {
    // Read from stdin
    buffer = fs.readFileSync(0);
  }

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = getDocument({
    data: uint8Array,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages || 1;
  const pageTexts = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageStr = content.items
      .map((item) => (item && item.str ? item.str : ""))
      .join(" ");
    pageTexts.push(pageStr);
  }

  const text = pageTexts.join("\n").trim();

  process.stdout.write(
    JSON.stringify({
      success: true,
      pageCount,
      text,
    })
  );
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
