Replace app/globals.css with this version.

This patch keeps your existing CSS and appends focused fixes for:
- centered hero/banner layout
- cleaner card separators without black empty blocks
- footer alignment and wrapping
- subtle hover improvements
- section divider lines

Audit summary:
{
  "hero_centered": true,
  "suggestions_centered": true,
  "black_grid_background_removed": true,
  "card_separators_present": true,
  "footer_fix_present": true,
  "mobile_footer_stack_present": true,
  "section_divider_present": true
}
