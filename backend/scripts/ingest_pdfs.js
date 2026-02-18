import "dotenv/config";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const require = createRequire(import.meta.url);
const { PDFParse, VerbosityLevel } = require("pdf-parse");

const PDF_DIR = path.resolve("data/pdfs");

function chunkText(text, size = 1000, overlap = 200) {
  const chunks = [];
  if (!text) return chunks;

  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + size);
    chunks.push(text.slice(i, end));

    if (end === text.length) break; // ✅ stop at end

    // ✅ always move forward (avoid infinite loop)
    i = Math.max(end - overlap, i + 1);
  }

  return chunks;
}


async function main() {
  const files = fs
    .readdirSync(PDF_DIR)
    .filter(f => f.endsWith(".pdf"));

  if (!files.length) {
    console.log("❌ No PDFs found");
    return;
  }

  for (const file of files) {
    console.log("📄 Processing:", file);

    const buffer = fs.readFileSync(path.join(PDF_DIR, file));

    const parser = new PDFParse({
      data: buffer,
      verbosity: VerbosityLevel.ERRORS
    });

    const result = await parser.getText();

    for (const page of result.pages) {
      const chunks = chunkText(page.text);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        const embeddingRes = await openai.embeddings.create({
          model: process.env.EMBEDDING_MODEL,
          input: chunk,
        });

        const embedding = embeddingRes.data[0].embedding;
        const vec = `[${embedding.join(",")}]`;

        await prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk"
          ("source","page","chunkIndex","content","embedding")
          VALUES
          (${file}, ${page.num}, ${i}, ${chunk}, ${vec}::vector)
        `;

        console.log(`   ✅ page ${page.num} chunk ${i}`);
      }
    }

    await parser.destroy();
  }

  console.log("🎉 DONE");
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
