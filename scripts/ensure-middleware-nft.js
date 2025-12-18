const fs = require("fs");
const path = require("path");

const serverDir = path.join(process.cwd(), ".next", "server");
const nftPath = path.join(serverDir, "middleware.js.nft.json");

function readMiddlewareFiles() {
  try {
    const manifestPath = path.join(serverDir, "middleware-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const middleware = manifest.middleware?.["/"];
    if (middleware?.files && Array.isArray(middleware.files)) {
      // mirror the relative file listing used by other .nft.json files
      return middleware.files.map((file) => path.join("..", file));
    }
  } catch {
    // ignore and fallback to empty list
  }
  return [];
}

function ensureNftFile() {
  if (fs.existsSync(nftPath)) return;

  const payload = {
    version: 1,
    files: readMiddlewareFiles(),
    external: [],
    trace: [],
  };

  fs.mkdirSync(path.dirname(nftPath), { recursive: true });
  fs.writeFileSync(nftPath, JSON.stringify(payload));
}

ensureNftFile();
