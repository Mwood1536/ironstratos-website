// PATCH each existing data source to add the properties the create call
// didn't apply (Notion 2025-09-03 created the DBs but ignored top-level
// `properties` since they belong on the data source).

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) { console.error("Set NOTION_TOKEN first."); process.exit(1); }

const VERSION = "2025-09-03";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Notion-Version": VERSION,
  "Content-Type": "application/json",
};

// Rename the default "Name" title column to "Email" and add the rest.
const newsletterProps = {
  "Name":            { name: "Email" },
  "Date Subscribed": { created_time: {} },
  "Source Page":     { rich_text: {} },
  "Status":          { select: { options: [
    { name: "Active",       color: "green" },
    { name: "Unsubscribed", color: "gray"  },
  ] } },
};

const sizeOptions = [
  { name: "<10",     color: "gray"   },
  { name: "10-50",   color: "blue"   },
  { name: "50-200",  color: "green"  },
  { name: "200-500", color: "yellow" },
  { name: "500+",    color: "orange" },
  { name: "Unknown", color: "default" },
];

// Two-step: first rename the title "Name" → "Email", then add the new "Name" rich_text.
const betaRename = { "Name": { name: "Email" } };
const betaProps = {
  "Name":                { rich_text: {} },
  "Company":             { rich_text: {} },
  "Role":                { rich_text: {} },
  "Which App":           { select: { options: [
    { name: "Root Cause AI", color: "orange" },
    { name: "NConform",      color: "blue"   },
    { name: "Both",          color: "purple" },
  ] } },
  "Plant Size":          { select: { options: sizeOptions } },
  "Current RCA Process": { rich_text: {} },
  "Date Submitted":      { created_time: {} },
  "Status":              { select: { options: [
    { name: "New",       color: "yellow" },
    { name: "Contacted", color: "blue"   },
    { name: "Onboarded", color: "green"  },
    { name: "Declined",  color: "red"    },
  ] } },
};

const demoRename = { "Name": { name: "Email" } };
const demoProps = {
  "Name":            { rich_text: {} },
  "Phone":           { phone_number: {} },
  "Company":         { rich_text: {} },
  "Title":           { rich_text: {} },
  "Plant Size":      { select: { options: sizeOptions } },
  "Tier Interest":   { select: { options: [
    { name: "Pro Web",    color: "orange" },
    { name: "Enterprise", color: "purple" },
    { name: "Not Sure",   color: "gray"   },
  ] } },
  "Timeline":        { select: { options: [
    { name: "Now",              color: "red"    },
    { name: "1-3 months",       color: "orange" },
    { name: "3-6 months",       color: "yellow" },
    { name: "Just researching", color: "gray"   },
  ] } },
  "Problem":         { rich_text: {} },
  "Date Submitted":  { created_time: {} },
  "Status":          { select: { options: [
    { name: "New",         color: "yellow" },
    { name: "Scheduled",   color: "blue"   },
    { name: "Demoed",      color: "purple" },
    { name: "Closed Won",  color: "green"  },
    { name: "Closed Lost", color: "red"    },
  ] } },
  "Estimated Value": { number: { format: "dollar" } },
};

async function patch(name, dataSourceId, properties, label) {
  const res = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ properties }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ ${name} [${label}]: ${res.status}`);
    console.error(text);
    return null;
  }
  return JSON.parse(text);
}

const targets = [
  { name: "CC Newsletter Subscribers", dataSourceId: "555437ab-76e2-4707-b375-108614db9967", rename: null, properties: newsletterProps },
  { name: "CC Beta Interest",          dataSourceId: "d2db4990-6027-4ae9-b690-0e6d67063501", rename: betaRename, properties: betaProps },
  { name: "CC Demo Requests",          dataSourceId: "a0e9780a-4984-4773-b348-172f6fc122e5", rename: demoRename, properties: demoProps },
];

for (const { name, dataSourceId, rename, properties } of targets) {
  if (rename) {
    const r1 = await patch(name, dataSourceId, rename, "rename");
    if (!r1) continue;
  }
  const r2 = await patch(name, dataSourceId, properties, "schema");
  if (!r2) continue;
  console.log(`✓ ${name}: ${Object.keys(r2.properties).length} properties`);
  for (const p of Object.keys(r2.properties)) console.log(`  - ${p} (${r2.properties[p].type})`);
}
