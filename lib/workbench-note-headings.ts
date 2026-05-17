export type NoteHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

export function extractHeadingsFromHtml(html: string): NoteHeading[] {
  const headings: NoteHeading[] = [];
  const regex = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3;
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    headings.push({ id: `h-${index}`, level, text });
    index += 1;
  }
  return headings;
}
