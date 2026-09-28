import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = "https://naomimusicrsa.co.za";

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT  = process.env.APPWRITE_PROJECT_ID;
const KEY      = process.env.APPWRITE_API_KEY;
const DB       = process.env.APPWRITE_DB_ID;
const SONGS    = process.env.APPWRITE_SONGS_TABLE_ID;

function xmlUrl(loc, priority, changefreq, lastmod) {
  let x = `  <url>\n    <loc>${loc}</loc>\n`;
  if (lastmod) x += `    <lastmod>${lastmod}</lastmod>\n`;
  x += `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  return x;
}

async function fetchSongs() {
  if (!ENDPOINT || !PROJECT || !KEY || !DB || !SONGS) {
    console.warn("[sitemap] Missing env vars — skipping dynamic URLs");
    return [];
  }
  const url = `${ENDPOINT}/databases/${DB}/collections/${SONGS}/documents?limit=500`;
  const res = await fetch(url, {
    headers: {
      "X-Appwrite-Project": PROJECT,
      "X-Appwrite-Key": KEY,
      "X-Appwrite-Response-Format": "1.6.0",
    },
  });
  if (!res.ok) {
    console.warn("[sitemap] Fetch failed:", res.status, await res.text());
    return [];
  }
  const data = await res.json();
  return data.documents || [];
}

async function main() {
  const songs = await fetchSongs();
  const approved = songs.filter((s) => s.status === "approved");

  const artists = new Set();
  for (const s of approved) if (s.uploadedByUserId) artists.add(s.uploadedByUserId);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  xml += xmlUrl(`${SITE}/`, "1.0", "daily");
  xml += xmlUrl(`${SITE}/about`, "0.5", "monthly");
  xml += xmlUrl(`${SITE}/terms`, "0.3", "monthly");
  xml += xmlUrl(`${SITE}/privacy`, "0.3", "monthly");
  xml += xmlUrl(`${SITE}/tscs`, "0.3", "monthly");
  xml += xmlUrl(`${SITE}/developer`, "0.3", "monthly");

  for (const s of approved) {
    const lastmod = (s.$updatedAt || s.$createdAt || "").slice(0, 10);
    xml += xmlUrl(`${SITE}/song/${s.$id}`, "0.8", "monthly", lastmod || undefined);
  }

  for (const a of artists) {
    xml += xmlUrl(`${SITE}/artist/${a}`, "0.6", "weekly");
  }

  xml += `</urlset>\n`;

  writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml);
  console.log(`[sitemap] wrote ${approved.length} songs, ${artists.size} artists`);
}

main().catch((e) => {
  console.error("[sitemap] fatal:", e.message);
  process.exit(0);
});
