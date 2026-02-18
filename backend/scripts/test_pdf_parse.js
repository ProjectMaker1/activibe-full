import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse, VerbosityLevel } = require("pdf-parse");

const filePath = path.resolve("data/pdfs/booklet.pdf");
console.log("reading:", filePath);

const buffer = fs.readFileSync(filePath);

const parser = new PDFParse({
  data: buffer,
  verbosity: VerbosityLevel.ERRORS, // რომ არ “იბლაბუნოს”
  // optional:
  // parseHyperlinks: true,
});

const result = await parser.getText(); // <-- ეს აბრუნებს pages + text

console.log("pages:", result.total);
console.log("text length:", result.text.length);
console.log("---- TEXT SAMPLE ----");
console.log(result.text.slice(0, 1200));

await parser.destroy?.();
