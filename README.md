# B&B Lounge

The salon's booking, payroll, inventory and staff app, as its own website.

- **Website:** opens from GitHub Pages; staff sign in with a username and password.
- **Data:** stored in Supabase (Singapore). Who can see and change what is enforced by the database (`supabase/schema.sql`).

## Files

| File | What it is |
|---|---|
| `index.html` | The website (built; don't edit by hand) |
| `src/app.html` | The app: screens, bookings, payroll, Facebook reader… |
| `src/site.js` | Connects the app to Supabase: sign-in, live data, logo, downloads |
| `config.js` | The Supabase project address and public key |
| `supabase/schema.sql` | Database tables and access rules |
| `build.py` | Rebuilds `index.html` after a change: `python3 build.py` |

## Roles

| Role | Can see |
|---|---|
| Owner | Everything, including edit history and business setup |
| HR & payroll | Everything except edit history and business setup |
| Staff | Bookings, clients, services, inventory, tech checklist, backjobs |
