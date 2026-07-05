import { readFile } from "node:fs/promises";

const manifestPath = new URL("../public/assets/manifest.json", import.meta.url);
const repoRoot = new URL("../public/", import.meta.url);
const pngSignature = "89504e470d0a1a0a";

function assetUrl(path) {
  return new URL(path, repoRoot);
}

async function readPngInfo(path) {
  const bytes = await readFile(assetUrl(path));

  if (bytes.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${path} is not a PNG file.`);
  }

  return {
    bytes: bytes.byteLength,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function collectEntries(manifest) {
  const entries = [];

  for (const asset of manifest.assets) {
    entries.push([`${asset.sign}:icon`, asset.icon]);
    entries.push([`${asset.sign}:nugget`, asset.nugget]);
    entries.push([`${asset.sign}:thumbnail`, asset.thumbnail]);
  }

  entries.push(["openGraph:share", manifest.openGraph.share]);

  for (const [sign, entry] of Object.entries(manifest.openGraph.signs ?? {})) {
    entries.push([`openGraph:${sign}`, entry]);
  }

  return entries;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

for (const [label, expected] of collectEntries(manifest)) {
  try {
    const actual = await readPngInfo(expected.path);

    for (const field of ["width", "height", "bytes"]) {
      if (actual[field] !== expected[field]) {
        failures.push(
          `${label} ${field}: expected ${expected[field]}, got ${actual[field]} (${expected.path})`
        );
      }
    }
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (manifest.assets.length !== manifest.signOrder.length) {
  failures.push(`asset count ${manifest.assets.length} does not match signOrder count ${manifest.signOrder.length}`);
}

const signs = manifest.assets.map((asset) => asset.sign);
const expectedOrder = manifest.signOrder.join(",");

if (signs.join(",") !== expectedOrder) {
  failures.push(`asset order does not match signOrder: ${signs.join(",")}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${collectEntries(manifest).length} PNG assets.`);
}
