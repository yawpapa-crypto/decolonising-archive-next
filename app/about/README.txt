Replace your public About page file with page.tsx

This version includes:
- dynamic rendering flag
- safer base URL chain including VERCEL_URL
- CMS fetch from /api/site-content
- rich text rendering for about body, mission body, and contact body

Audit summary:
{
  "source_file_loaded": true,
  "appears_to_be_about_page": true,
  "dynamic_flag_added": true,
  "vercel_url_added": true,
  "cms_fetch_present": true,
  "richtext_render_present": true
}
