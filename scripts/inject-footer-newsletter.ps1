# Injects the footer newsletter widget (CSS + HTML + JS) into every page
# that has a <footer> with .footer-grid. Idempotent — safe to re-run.

$ErrorActionPreference = "Stop"

$root = "C:\Users\WOODDESTORYERBOX\ironstratos-website"
$pages = @(
  "index.html",
  "about.html",
  "apps.html",
  "contact.html",
  "rootcause.html",
  "privacy.html",
  "terms.html",
  "rootcause\index.html",
  "rootcause\privacy.html",
  "rootcause\terms.html"
)

$marker = "/* === FOOTER NEWSLETTER === */"

$css = @"

$marker
.footer-newsletter {
  display: grid; grid-template-columns: 1fr 1.2fr; gap: 3rem;
  padding-bottom: 3rem; margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--border); align-items: start;
}
.footer-newsletter .fn-label {
  font-family: var(--mono); font-size: 0.72rem; color: var(--burnt-orange);
  text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;
}
.footer-newsletter .fn-label::before { content: '// '; color: var(--warm-gray-light); }
.footer-newsletter h4 {
  font-family: var(--serif); font-size: 1.3rem; font-weight: 400;
  letter-spacing: -0.01em; margin-bottom: 0.5rem; color: var(--espresso);
}
.footer-newsletter .fn-text > p:last-of-type {
  font-size: 0.9rem; color: var(--warm-gray); line-height: 1.6; max-width: 380px;
}
.fn-form { display: flex; flex-direction: column; gap: 0.85rem; }
.fn-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.fn-srlabel { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
.fn-row { display: flex; gap: 0.5rem; }
.fn-row input[type=email] {
  flex: 1; min-width: 0; padding: 12px 16px;
  font-family: var(--sans); font-size: 0.92rem; color: var(--espresso);
  border: 1.5px solid var(--border); border-radius: 8px; background: var(--cream);
  outline: none; transition: border-color 0.3s, box-shadow 0.3s;
}
.fn-row input[type=email]:focus {
  border-color: var(--burnt-orange);
  box-shadow: 0 0 0 3px var(--burnt-orange-light);
}
.fn-row input[type=email][aria-invalid="true"] { border-color: var(--burnt-orange); }
.fn-btn {
  padding: 12px 20px; background: var(--burnt-orange); color: var(--cream);
  font-family: var(--mono); font-size: 0.8rem; font-weight: 500;
  border: none; border-radius: 8px; cursor: pointer;
  transition: all 0.3s; box-shadow: 0 2px 12px rgba(200, 90, 44, 0.2);
  white-space: nowrap;
}
.fn-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(200, 90, 44, 0.3); }
.fn-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.fn-consent { display: flex; gap: 0.5rem; align-items: flex-start; font-family: var(--mono); font-size: 0.7rem; color: var(--warm-gray); line-height: 1.5; }
.fn-consent input { margin-top: 2px; accent-color: var(--burnt-orange); flex-shrink: 0; }
.fn-consent a { color: var(--burnt-orange); text-decoration: none; }
.fn-consent a:hover { text-decoration: underline; }
.fn-status { font-family: var(--mono); font-size: 0.78rem; display: none; border-radius: 6px; line-height: 1.4; }
.fn-status.show { display: block; padding: 10px 14px; }
.fn-status.ok { background: var(--avocado-light); color: var(--avocado); }
.fn-status.err { background: var(--burnt-orange-light); color: var(--burnt-orange); }
@media (max-width: 768px) {
  .footer-newsletter { grid-template-columns: 1fr; gap: 1.5rem; padding-bottom: 2rem; margin-bottom: 2rem; }
  .fn-row { flex-direction: column; }
  .fn-btn { width: 100%; }
}
"@

$html = @"

    <div class="footer-newsletter">
      <div class="fn-text">
        <p class="fn-label">newsletter</p>
        <h4>Field notes from the floor.</h4>
        <p>Product updates, RCA patterns, and the occasional NConform release note. Maybe one email a month — no fluff.</p>
      </div>
      <form class="fn-form" id="footer-newsletter-form" novalidate>
        <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="fn-honeypot">
        <div class="fn-row">
          <label class="fn-srlabel" for="footer-newsletter-email">Email</label>
          <input type="email" id="footer-newsletter-email" name="email" placeholder="you@plant.com" required aria-required="true" autocomplete="email">
          <button type="submit" class="fn-btn">Subscribe →</button>
        </div>
        <label class="fn-consent">
          <input type="checkbox" name="consent" required aria-required="true">
          <span>I agree to the <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.</span>
        </label>
        <div class="fn-status" role="status" aria-live="polite"></div>
      </form>
    </div>
"@

$js = @"

<script>
(function() {
  var form = document.getElementById('footer-newsletter-form');
  if (!form) return;
  var status = form.querySelector('.fn-status');
  var btn = form.querySelector('.fn-btn');
  var email = form.querySelector('input[type=email]');
  function setStatus(kind, msg) {
    status.className = 'fn-status show ' + kind;
    status.textContent = msg;
  }
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    email.setAttribute('aria-invalid', 'false');
    if (!form.checkValidity()) {
      email.setAttribute('aria-invalid', 'true');
      setStatus('err', 'Please enter a valid email and accept the privacy terms.');
      return;
    }
    btn.disabled = true;
    var prev = btn.textContent;
    btn.textContent = 'Sending...';
    try {
      var res = await fetch('/.netlify/functions/newsletter-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.value,
          website: form.querySelector('input[name=website]').value,
          source: location.pathname || 'unknown'
        })
      });
      var data = await res.json().catch(function() { return {}; });
      if (res.ok && data.ok) {
        setStatus('ok', '✓ Subscribed! Check your inbox for confirmation.');
        form.reset();
      } else {
        setStatus('err', (data && data.error) || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('err', 'Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
    }
  });
})();
</script>
"@

foreach ($rel in $pages) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) {
    Write-Host "SKIP missing: $rel"
    continue
  }
  $content = Get-Content -Raw -Path $path

  if ($content.Contains("footer-newsletter")) {
    Write-Host "SKIP already-injected: $rel"
    continue
  }

  # 1) Inject CSS just before the closing </style> of the FIRST <style> block
  $idxStyleEnd = $content.IndexOf("</style>")
  if ($idxStyleEnd -lt 0) { Write-Host "SKIP no </style>: $rel"; continue }
  $content = $content.Substring(0, $idxStyleEnd) + $css + "`n" + $content.Substring($idxStyleEnd)

  # 2) Insert HTML just before the <div class="footer-grid">
  $needle = '<div class="footer-grid">'
  $idxGrid = $content.IndexOf($needle)
  if ($idxGrid -lt 0) { Write-Host "SKIP no .footer-grid: $rel"; continue }
  $content = $content.Substring(0, $idxGrid) + $html.TrimEnd() + "`n    " + $content.Substring($idxGrid)

  # 3) Append JS just before </body>
  $idxBody = $content.LastIndexOf("</body>")
  if ($idxBody -lt 0) { Write-Host "SKIP no </body>: $rel"; continue }
  $content = $content.Substring(0, $idxBody) + $js + "`n" + $content.Substring($idxBody)

  Set-Content -Path $path -Value $content -NoNewline -Encoding UTF8
  Write-Host "OK: $rel"
}
