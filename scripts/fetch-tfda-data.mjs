import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const datasets = [
  { id: 203, slug: "cosmetic-prohibited-ingredients", label: "화장품 금지 성분" },
  { id: 199, slug: "cosmetic-restricted-ingredients", label: "화장품 제한 성분" },
  { id: 201, slug: "cosmetic-preservatives", label: "화장품 방부제 제한" },
  { id: 202, slug: "cosmetic-sunscreens", label: "화장품 자외선차단제 제한" },
  { id: 200, slug: "cosmetic-colorants", label: "화장품 색소 제한" }
];

const outDir = path.join(process.cwd(), "data", "tfda");
await mkdir(outDir, { recursive: true });

const manifest = {
  fetchedAt: new Date().toISOString(),
  source: "https://data.fda.gov.tw/",
  datasets: []
};

for (const item of datasets) {
  const url = `https://data.fda.gov.tw/data/opendata/export/${item.id}/json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TFDA fetch failed for ${item.id}: ${response.status}`);
  }
  const text = await response.text();
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));
  const jsonPath = path.join(outDir, `${item.slug}.json`);
  await writeFile(jsonPath, JSON.stringify(data, null, 2), "utf8");
  manifest.datasets.push({
    ...item,
    url,
    rows: data.length,
    file: `data/tfda/${item.slug}.json`
  });
}

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify(manifest, null, 2));
