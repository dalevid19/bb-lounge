#!/usr/bin/env python3
"""Builds index.html for the B&B Lounge website from the shared app code (src/app.html)
plus the website connector (src/site.js). Run: python3 build.py"""
import pathlib, re
root = pathlib.Path(__file__).parent
app = (root / "src/app.html").read_text()
site = (root / "src/site.js").read_text()
shell = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#c7247f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="B&amp;B Lounge">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<style>
:root {{ color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
body {{ margin: 0; font: 14px system-ui, -apple-system, "Segoe UI", sans-serif; }}
img {{ max-width: 100%; }}
[hidden] {{ display: none !important; }}
#bbLogin {{ position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px max(16px, env(safe-area-inset-left, 0px)); background: var(--bg, #fbf6f9); overflow-y: auto; }}
#bbLogin .box {{ width: min(380px, 100%); display: grid; gap: 14px; text-align: center; }}
#bbLogin .lg {{ font-family: var(--f-display, Georgia, serif); font-size: 34px; font-weight: 700; color: var(--accent, #c7247f); margin: 0; }}
#bbLogin .tg {{ color: var(--muted, #6f5f66); margin: -8px 0 6px; }}
#bbLogin form {{ display: grid; gap: 12px; text-align: left; background: var(--surface, #fff); border: 1px solid var(--line, #e2d8dc); border-radius: 14px; padding: 20px; }}
#bbLogin label {{ display: grid; gap: 5px; font-size: 13px; font-weight: 700; color: var(--muted, #6f5f66); }}
#bbLogin input {{ font: inherit; font-size: 16px; padding: 11px 12px; border: 1px solid var(--line, #e2d8dc); border-radius: 10px; background: var(--surface, #fff); color: var(--ink, #241a1f); }}
#bbLogin button {{ font: inherit; font-weight: 700; font-size: 16px; padding: 12px; border: 0; border-radius: 10px; background: var(--accent, #c7247f); color: var(--accent-ink, #fff); cursor: pointer; }}
#bbLogin button:disabled {{ opacity: .6; }}
#bbLoginMsg {{ min-height: 1.2em; color: var(--bad, #b3261e); font-size: 14px; margin: 0; }}
#bbLogin .help {{ font-size: 13px; color: var(--muted, #6f5f66); }}
</style>
<script src="vendor-supabase.js"></script>
<script src="config.js"></script>
</head>
<body>
<div id="bbLogin" hidden>
  <div class="box">
    <img src="icon-512.png" alt="B&amp;B Lounge" style="max-height:120px;margin:0 auto;display:block" onerror="this.remove()">
    <p class="lg">B&amp;B Lounge</p>
    <p class="tg">At your own place</p>
    <form id="bbLoginForm" autocomplete="on">
      <label for="bbUser">Username<input id="bbUser" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></label>
      <label for="bbPass">Password<input id="bbPass" name="password" type="password" autocomplete="current-password" required></label>
      <button id="bbLoginBtn" type="submit">Sign in</button>
      <p id="bbLoginMsg" role="alert"></p>
    </form>
    <p class="help">Forgot your password? Ask the owner to give you a new one.</p>
  </div>
</div>
<script>
{site}
</script>
{app}
</body>
</html>
"""
(root / "index.html").write_text(shell)
print("index.html", len(shell), "bytes")
