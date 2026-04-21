Rebuilt app.js with verified CMS homepage bindings.

Replace this file:
public/assets/js/app.js

What was changed:
- Added siteContent defaults
- Added loadSiteContent()
- Replaced hardcoded hero eyebrow, heading, and intro
- Replaced first homepage section titles for Featured Records, Collections, and Browse by Theme
- Replaced app boot so CMS content loads before initArchiveApp()

Verification summary:
{
  "siteContent_injected": true,
  "hero_eyebrow_matches_before": 1,
  "hero_eyebrow_replaced": true,
  "hero_heading_matches_before": 1,
  "hero_heading_replaced": true,
  "hero_intro_matches_before": 1,
  "hero_intro_replaced": true,
  "featuredTitle_matches_before": 1,
  "featuredTitle_replaced": true,
  "collectionsTitle_matches_before": 1,
  "collectionsTitle_replaced": true,
  "themesTitle_matches_before": 1,
  "themesTitle_replaced": true,
  "boot_matches_before": 1,
  "boot_replaced": true,
  "hardcoded_heading_remaining": false,
  "hardcoded_intro_remaining": false,
  "hardcoded_eyebrow_remaining": false,
  "bootArchiveApp_present": true,
  "loadSiteContent_present": true,
  "cms_heading_present": true,
  "cms_intro_present": true,
  "cms_eyebrow_present": true
}

After replacing the file:
1. restart the dev server
2. go to /admin/pages
3. change the heading or eyebrow
4. click Save changes
5. refresh /

If the homepage still does not change, the live file being served is not this file path.
