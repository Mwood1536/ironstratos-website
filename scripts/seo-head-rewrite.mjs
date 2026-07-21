// One-shot head rewriter: replaces the block between <title> and the first
// <link rel="preconnect"> with a normalized meta block per page config.
import { readFileSync, writeFileSync } from 'node:fs';

const OG_IMAGE = 'https://ironstratos.com/og-image.png';

const PAGES = {
  'index.html': {
    title: 'IronStratos - Root Cause Analysis & CAPA Apps for Manufacturing',
    desc: 'IronStratos builds guided 5 Why root cause analysis, CAPA, and nonconformance tracking apps for the shop floor. Fix it, prove it, move on. Offline-first, audit-ready reports.',
    canonical: 'https://ironstratos.com/',
  },
  'rootcause.html': {
    title: 'Root Cause AI - Guided 5 Why Root Cause Analysis App',
    desc: 'Guided 5 Why root cause analysis with corrective actions, safety observations, and audit-ready reports for maintenance and manufacturing teams. Available on Google Play.',
    canonical: 'https://ironstratos.com/rootcause.html',
  },
  'apps.html': {
    title: 'Apps - Root Cause AI & NConform | IronStratos',
    desc: 'The IronStratos apps: Root Cause AI for guided root cause analysis, live on Android, and NConform for nonconformance (NCR) and CAPA tracking, in development.',
    canonical: 'https://ironstratos.com/apps.html',
  },
  'about.html': {
    title: 'About IronStratos - Software Built for Manufacturing Teams',
    desc: 'IronStratos (Iron Stratos LLC, Smiths Station, Alabama) builds Root Cause AI and NConform - quality and reliability software aligned to ISO 9001, IATF 16949, and AS9100.',
    canonical: 'https://ironstratos.com/about.html',
  },
  'services.html': {
    title: 'Services - RCA, CAPA & Audit Platform | IronStratos',
    desc: 'How the IronStratos platform fits on your floor: Root Cause AI for root cause analysis and NConform for CAPA and layered process audits, with ISO 9001 / IATF 16949 / AS9100 alignment.',
    canonical: 'https://ironstratos.com/services',
  },
  'contact.html': {
    title: 'Contact IronStratos',
    desc: 'Get in touch with IronStratos about Root Cause AI, NConform, or how the manufacturing quality platform fits on your floor.',
    canonical: 'https://ironstratos.com/contact.html',
  },
  'newsletter.html': {
    title: 'Newsletter - Field Notes from the Floor | IronStratos',
    desc: 'Field notes from the floor. Product updates, RCA patterns, and the occasional NConform release note. One email a month - no fluff.',
    canonical: 'https://ironstratos.com/newsletter',
    robots: 'index,follow',
  },
  'privacy.html': {
    title: 'Privacy Policy - IronStratos',
    desc: 'Privacy Policy for Iron Stratos LLC (IronStratos), covering the Root Cause AI and NConform apps and the Pro Web dashboard.',
    canonical: 'https://ironstratos.com/privacy.html',
  },
  'terms.html': {
    title: 'Terms of Service - IronStratos',
    desc: 'The terms that govern use of Root Cause AI, NConform, and IronStratos Pro Web, provided by Iron Stratos LLC.',
    canonical: 'https://ironstratos.com/terms.html',
  },
  'delete-account.html': {
    title: 'Request Account Deletion - IronStratos',
    desc: 'How to request deletion of your Root Cause AI or NConform account and all synced data - Iron Stratos LLC (IronStratos).',
    canonical: 'https://ironstratos.com/delete-account',
  },
  '404.html': {
    title: 'Page Not Found - IronStratos',
    desc: 'The page you are looking for does not exist or has moved. Head back to the IronStratos homepage.',
    canonical: 'https://ironstratos.com/404.html',
  },
  'beta.html': {
    title: 'Beta Access - Root Cause AI on iOS & NConform | IronStratos',
    desc: 'Request beta access to Root Cause AI on iOS or NConform. Early access for plants ready to swap spreadsheets for an audit-ready quality system.',
    canonical: 'https://ironstratos.com/beta',
    robots: 'index,follow',
  },
  'demo.html': {
    title: 'Request a Demo - Pro Web & Enterprise | IronStratos',
    desc: 'See Root Cause AI + NConform on your floor. 30-minute walkthrough tailored to Pro Web or Enterprise plants.',
    canonical: 'https://ironstratos.com/demo',
    robots: 'index,follow',
  },
  'rootcause/privacy.html': {
    title: 'Root Cause AI Privacy Policy - IronStratos',
    desc: 'Privacy policy for the Root Cause AI mobile application.',
    canonical: 'https://ironstratos.com/rootcause/privacy.html',
  },
  'rootcause/terms.html': {
    title: 'Root Cause AI Terms of Service - IronStratos',
    desc: 'Terms of service for the Root Cause AI mobile application.',
    canonical: 'https://ironstratos.com/rootcause/terms.html',
  },
  'nconform/privacy.html': {
    title: 'NConform Privacy Policy - IronStratos',
    desc: 'Privacy policy for the NConform mobile application.',
    canonical: 'https://ironstratos.com/nconform/privacy.html',
  },
  'nconform/terms.html': {
    title: 'NConform Terms of Service - IronStratos',
    desc: 'Terms of service for the NConform mobile application.',
    canonical: 'https://ironstratos.com/nconform/terms.html',
  },
  'beta/thanks.html': {
    title: 'Thanks - Beta Access - IronStratos',
    desc: 'You are on the IronStratos beta list. Here is what happens next.',
    canonical: 'https://ironstratos.com/beta/thanks',
    robots: 'noindex,follow',
  },
  'demo/thanks.html': {
    title: 'Thanks - Demo Request - IronStratos',
    desc: 'Demo request received. Pick a time that works for your floor.',
    canonical: 'https://ironstratos.com/demo/thanks',
    robots: 'noindex,follow',
  },
  'legal/dpa.html': {
    title: 'Data Processing Addendum - IronStratos',
    desc: 'Data Processing Addendum for IronStratos Pro Web, provided by Iron Stratos LLC.',
    canonical: 'https://ironstratos.com/legal/dpa',
    robots: 'noindex',
  },
  'legal/subscription-agreement.html': {
    title: 'Pro Subscription Agreement - IronStratos',
    desc: 'The click-through subscription agreement for IronStratos Pro Web, provided by Iron Stratos LLC.',
    canonical: 'https://ironstratos.com/legal/subscription-agreement',
    robots: 'noindex',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function block(p) {
  const lines = [
    `<title>${esc(p.title)}</title>`,
    `<link rel="canonical" href="${p.canonical}">`,
    `<meta name="description" content="${esc(p.desc)}">`,
  ];
  if (p.robots) lines.push(`<meta name="robots" content="${p.robots}">`);
  lines.push(
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(p.title)}">`,
    `<meta property="og:description" content="${esc(p.desc)}">`,
    `<meta property="og:url" content="${p.canonical}">`,
    `<meta property="og:site_name" content="IronStratos">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(p.title)}">`,
    `<meta name="twitter:description" content="${esc(p.desc)}">`,
    `<meta name="twitter:image" content="${OG_IMAGE}">`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
  );
  return lines.join('\n');
}

let failures = 0;
for (const [file, cfg] of Object.entries(PAGES)) {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('<title>');
  const end = src.indexOf('<link rel="preconnect"');
  if (start === -1 || end === -1 || end < start) {
    console.error(`SKIP ${file}: anchors not found`);
    failures++;
    continue;
  }
  const out = src.slice(0, start) + block(cfg) + '\n' + src.slice(end);
  writeFileSync(file, out);
  console.log(`OK   ${file}`);
}
process.exit(failures ? 1 : 0);
