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
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<style>
:root {{ color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
body {{ margin: 0; font: 14px system-ui, -apple-system, "Segoe UI", sans-serif; }}
img {{ max-width: 100%; }}
[hidden] {{ display: none !important; }}
#bbLogin, #bbLogin * {{ box-sizing: border-box; }}
#bbLogin img {{ background: none; border: 0; box-shadow: none; padding: 0; border-radius: 0; height: auto; }}
#bbLogin {{ position: fixed; inset: 0; z-index: 100; overflow-y: auto; overflow-x: hidden; display: grid; grid-template-columns: minmax(0, 400px); justify-content: center; align-content: center; padding: max(24px, env(safe-area-inset-top, 0px)) 16px max(24px, env(safe-area-inset-bottom, 0px));
  font-family: Poppins, system-ui, -apple-system, "Segoe UI", sans-serif; color: #2a1d23;
  background:
    radial-gradient(circle at 50% 78%, rgba(255,255,255,.55) 0, rgba(255,255,255,0) 22%),
    radial-gradient(ellipse 60% 26% at 50% 82%, #e98fa9 0, rgba(233,143,169,.55) 55%, rgba(233,143,169,0) 100%),
    radial-gradient(circle at 78% 30%, rgba(255,214,226,.9) 0, rgba(255,214,226,0) 34%),
    radial-gradient(ellipse 120% 40% at 50% 100%, #f2c3c9 0, #ecb2bb 60%, rgba(236,178,187,0) 100%),
    linear-gradient(180deg, #e7a0b2 0%, #f0b8c4 48%, #f3c9cd 70%, #edbac1 100%); }}
#bbLogin::before {{ content: ""; position: fixed; left: -10%; right: -10%; top: 46%; height: 18%; pointer-events: none;
  background: radial-gradient(ellipse 30% 70% at 18% 100%, rgba(170,96,92,.45), transparent 70%), radial-gradient(ellipse 22% 80% at 52% 100%, rgba(180,104,98,.35), transparent 70%), radial-gradient(ellipse 30% 60% at 88% 100%, rgba(170,96,92,.4), transparent 70%); filter: blur(2px); }}
#bbLogin .bb-box {{ position: relative; width: 100%; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }}
#bbLogin .bb-card {{ position: relative; min-width: 0; padding: 22px 22px 18px; border-radius: 30px; background: linear-gradient(160deg, rgba(255,255,255,.72), rgba(255,255,255,.42)); border: 1px solid rgba(255,255,255,.75);
  box-shadow: 0 24px 60px -24px rgba(120,40,70,.45), inset 0 1px 0 rgba(255,255,255,.9); -webkit-backdrop-filter: blur(18px) saturate(1.2); backdrop-filter: blur(18px) saturate(1.2); }}
#bbLogin .bb-logo {{ display: block; width: min(220px, 62%); margin: 0 auto 4px; }}
#bbLogin .bb-top {{ display: flex; align-items: center; justify-content: space-between; margin: 6px 2px 16px; }}
#bbLogin .bb-h {{ margin: 0; font-size: 26px; font-weight: 500; letter-spacing: -.3px; }}
#bbLogin .bb-chip {{ font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 99px; border: 1px solid rgba(42,29,35,.18); background: rgba(255,255,255,.55); }}
#bbLogin form {{ display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; }}
#bbLogin .bb-pill {{ min-width: 0; width: 100%; margin: 0; display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 7px; border-radius: 99px; background: rgba(255,255,255,.82); box-shadow: inset 0 0 0 1px rgba(255,255,255,.9), 0 2px 8px -4px rgba(120,40,70,.25); }}
#bbLogin .bb-pill:focus-within {{ box-shadow: inset 0 0 0 2px #c7247f, 0 2px 8px -4px rgba(120,40,70,.25); }}
#bbLogin .bb-ico {{ flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: #fff; box-shadow: 0 1px 4px rgba(120,40,70,.18); color: #2a1d23; }}
#bbLogin .bb-ico svg, #bbLogin .bb-eye svg, #bbLogin .bb-go svg {{ width: 17px; height: 17px; }}
#bbLogin input {{ flex: 1 1 0; width: 0; min-width: 0; height: auto; box-shadow: none; border-radius: 0; font: inherit; font-size: 16px; border: 0; outline: 0; background: transparent; color: #2a1d23; padding: 8px 0; }}
#bbLogin input::placeholder {{ color: #7a6870; }}
#bbLogin #bbPass {{ letter-spacing: 4px; }}
#bbLogin #bbPass::placeholder {{ letter-spacing: 0; }}
#bbLogin .bb-eye {{ flex: 0 0 auto; display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 500; color: #2a1d23; background: #fff; border: 0; border-radius: 99px; padding: 8px 12px; cursor: pointer; box-shadow: 0 1px 4px rgba(120,40,70,.18); }}
#bbLogin .bb-row {{ min-width: 0; display: flex; align-items: center; gap: 14px; margin-top: 6px; }}
#bbLogin .bb-row p {{ flex: 1; min-width: 0; white-space: normal; margin: 0; font-size: 12px; line-height: 1.45; color: #5b4a51; }}
#bbLogin .bb-go {{ flex: 0 0 auto; display: flex; align-items: center; gap: 10px; border: 0; cursor: pointer; font: inherit; font-size: 14px; font-weight: 500; color: #fff; background: #241a1f; border-radius: 99px; padding: 6px 6px 6px 18px; box-shadow: 0 10px 22px -10px rgba(36,26,31,.7); }}
#bbLogin .bb-go span {{ width: 36px; height: 36px; border-radius: 50%; background: #fff; color: #241a1f; display: grid; place-items: center; }}
#bbLogin .bb-go:disabled {{ opacity: .6; }}
#bbLoginMsg:empty {{ display: none; }}
#bbLoginMsg {{ margin: 2px 4px 0; color: #a3123f; font-size: 13px; font-weight: 500; }}
#bbLogin .bb-foot {{ text-align: center; font-size: 12px; font-weight: 500; color: #4a3940; margin: 0; }}
#bbLogin .bb-dark {{ display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-radius: 26px; background: #201a1d; color: #fff; }}
#bbLogin .bb-dark b {{ display: block; font-size: 19px; font-weight: 500; }}
#bbLogin .bb-dark span {{ font-size: 13px; color: #b9a9b0; }}
#bbLogin .bb-dark i {{ font-style: normal; font-size: 13px; color: #fff; }}
</style>
<script src="vendor-supabase.js"></script>
<script src="config.js"></script>
</head>
<body>
<div id="bbLogin" hidden>
  <div class="bb-box">
    <div class="bb-card">
      <img class="bb-logo" src="icon-logo.png" alt="B&amp;B Lounge, at your own place">
      <div class="bb-top"><p class="bb-h">Log in</p><span class="bb-chip">Staff only</span></div>
      <form id="bbLoginForm" autocomplete="on">
        <label class="bb-pill"><span class="bb-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></span>
          <input id="bbUser" name="username" placeholder="username" aria-label="Username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></label>
        <label class="bb-pill"><span class="bb-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/></svg></span>
          <input id="bbPass" name="password" type="password" placeholder="6-digit PIN" aria-label="PIN" inputmode="numeric" autocomplete="current-password" required>
          <button type="button" class="bb-eye" id="bbEye" aria-pressed="false" aria-label="Show PIN">Show</button></label>
        <p id="bbLoginMsg" role="alert"></p>
        <div class="bb-row"><p>Forgot your PIN? Ask the owner to give you a new one.</p>
          <button class="bb-go" id="bbLoginBtn" type="submit">Sign in<span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span></button></div>
      </form>
    </div>
    <div class="bb-dark"><div><b>B&amp;B Lounge</b><span>Nails · Lash · Spa</span></div><i>At your own place</i></div>
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
