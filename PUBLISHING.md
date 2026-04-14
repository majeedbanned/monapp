Publish the contents of `website/` as the static site root for `https://monelyapp.com`.

Notes:
- `site-config.js` is the single source for launch-time IDs and endpoints (`siteUrl`, App Store URL, GA4 ID, Search Console verification, and email endpoint values).
- `favicon`, `apple-touch-icon`, `manifest`, `404.html`, legal pages, and social preview assets are included.
- `sitemap.xml` and `robots.txt` should be deployed at the same root.

Analytics and events QA checklist:
- Confirm `window.MONELY_SITE.ga4MeasurementId` is set in production config.
- Open GA4 DebugView and verify events fire once per action: `page_view`, `app_store_click`, `demo_play`, `scroll_50`, `scroll_90`, `faq_open`, `contact_support_click`, `email_capture_submit`, `email_capture_success`, `email_capture_error`.
- Click App Store CTAs in hero, sticky header, and footer and confirm `app_store_click` includes `cta_location`.
- Submit the email form with:
  - an invalid address (expect validation message + `email_capture_error`)
  - a valid address (expect success state + `email_capture_success` when endpoint is configured)
- If email signup endpoint config is blank, expect a user-visible error state and no false success UI.
- Keep `privacy.html` aligned with actual analytics and email collection behavior before each release.
