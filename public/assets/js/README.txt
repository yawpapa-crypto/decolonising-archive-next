Replace:
- public/assets/js/app.js

This patch is built from your latest uploaded app.js.

What it changes:
- clicking any result card with a record id now opens the internal detail page first
- only cards without a record id fall back to opening an external URL
- this removes the old external_handoff gate in bindCardEvents(), which is what was stopping CORE/OpenAlex live cards from opening the detail page you want

Audit summary:
{
  "source_file_loaded": true,
  "original_bindcardevents_used_external_handoff": true,
  "patched_bindcardevents_prefers_record": true,
  "patched_no_external_handoff_gate": true
}
