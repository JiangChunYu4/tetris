import fs from "fs";
import path from "path";

const docsDir = path.resolve(process.cwd(), "docs");
const indexPath = path.join(docsDir, "index.html");
const notFoundPath = path.join(docsDir, "404.html");

async function copy404() {
  const content = fs.readFileSync(indexPath, "utf-8");
  fs.writeFileSync(notFoundPath, content, "utf-8");
}

copy404();