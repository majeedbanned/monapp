Publish the contents of `website/` as the static site root.

Notes:
- `robots.txt` already prevents the unrelated archived Sift files from being crawled.
- `favicon`, `apple-touch-icon`, `manifest`, `404.html`, legal pages, and the social preview asset are included.
- A sitemap is intentionally not hardcoded here because XML sitemaps require absolute production URLs. Add one after the final domain is fixed.
- If you later add analytics, a waitlist form, or third-party support widgets, update `privacy.html` before publishing that revision.
