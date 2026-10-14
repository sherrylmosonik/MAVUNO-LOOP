# MavunoLoop (hackathon MVP)

Open `index.html` in a browser (or run `npx serve .`). No build step. Data is saved in the browser (localStorage).

## Structure
```
index.html          page shell + script order
css/style.css       all styles
js/data.js          constants, shelf-life table, alternative-use catalogue, sample data
js/store.js         state, saving, demo login, notifications, status changes
js/rules.js         freshness rules, alert checker, alternative-use flow, search & ranking
js/ui.js            shared helpers/components
js/pages-public.js  landing, login, register, marketplace, listing, notifications
js/pages-farmer.js  dashboard, listings, form, freshness centre, enquiries, e-cards
js/pages-buyer.js   dashboard, my enquiries
js/pages-admin.js   cooperative board: overview, listings, reports, members
js/pages-ussd.js    USSD menu logic (stateless handler, back/home) + phone simulator
js/chat.js          assistant: classifies produce vs residue vs spoiled, searches real listings, pre-fills the form
js/main.js          router, role navigation, route guards
```

## Pages by role
- Public: `/` landing, `/market`, `/l/:id`, `/login/farmer|buyer|admin`, `/register/farmer|buyer`
- Farmer: `/farmer`, `/farmer/listings`, `/farmer/new`, `/farmer/edit/:id`, `/farmer/freshness`, `/farmer/enquiries`, `/farmer/ecard`
- Buyer: `/buyer`, `/buyer/enquiries`
- Cooperative board: `/admin`, `/admin/listings`, `/admin/reports`, `/admin/members`
- Any logged-in user: `/notifications`

## Demo accounts (browser-only, NOT secure authentication)
- farmer@mavunoloop.demo / farmer123
- buyer@mavunoloop.demo / buyer123
- board@mavunoloop.demo / board123

## Freshness logic and limits
Estimate = days since harvest / (crop shelf-life x storage factor). Thresholds: 60% attention, 85% at risk, 100% urgent review; farmer-reported "deteriorating" also triggers urgent review. Shelf-life values in `data.js` are illustrative and must be validated with agricultural guidance. Estimates never mean confirmed spoilage; missing data shows "Condition check needed".

## Not yet built (next steps)
Supabase (auth, Postgres schema + RLS, image storage), LLM API for search/listing assistant (rule-based parser used now), scheduled server-side checker, real SMS/email, QR code on e-cards, Swahili strings, a live USSD shortcode (the simulator at /ussd is simulation only).

## Hero video / photos
The landing hero shows an inline SVG farm scene. To use real footage, add a short muted loop at `assets/hero.mp4`; it is laid over the scene automatically (and ignored if the file is missing). Use footage you have the right to use.

## Adding a real AI model to the chat
Set `ML.CONFIG.aiEndpoint` in `js/chat.js` to a server function (e.g. Supabase Edge Function) that calls the LLM with your API key and returns `{ kind, crop, qty, unit, loc, price }`. The browser validates the output and falls back to the built-in rules if the call fails. Never put the API key in the browser.
