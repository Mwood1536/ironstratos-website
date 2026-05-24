// Delete (archive) any test rows from today across the 3 lead-gen DBs.
// Identifies test rows by an email containing "test-" with ironstratos.com domain.

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) { console.error("Set NOTION_TOKEN first."); process.exit(1); }

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Notion-Version": "2025-09-03",
  "Content-Type": "application/json",
};

const sources = [
  { name: "Newsletter", ds: "555437ab-76e2-4707-b375-108614db9967" },
  { name: "Beta",       ds: "d2db4990-6027-4ae9-b690-0e6d67063501" },
  { name: "Demo",       ds: "a0e9780a-4984-4773-b348-172f6fc122e5" },
];

for (const { name, ds } of sources) {
  const res = await fetch(`https://api.notion.com/v1/data_sources/${ds}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      filter: { property: "Email", title: { contains: "test-" } },
      page_size: 50,
    }),
  });
  if (!res.ok) { console.error(`${name} query failed:`, await res.text()); continue; }
  const data = await res.json();
  console.log(`${name}: found ${data.results.length} test row(s)`);

  for (const page of data.results) {
    const del = await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ archived: true }),
    });
    if (!del.ok) console.error(`  archive ${page.id} failed:`, del.status);
    else console.log(`  ✓ archived ${page.id}`);
  }
}
