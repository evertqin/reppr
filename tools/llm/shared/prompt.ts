/**
 * Strip surrounding markdown code fences from a response and try to extract a JSON object/array.
 */
export function requireJsonObject(text: string): unknown {
  let t = text.trim();
  // remove ```json ... ``` fences
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fence) t = fence[1].trim();
  // find first { or [
  const start = Math.min(
    ...['{', '['].map((c) => {
      const i = t.indexOf(c);
      return i < 0 ? Number.POSITIVE_INFINITY : i;
    }),
  );
  if (!Number.isFinite(start)) throw new Error('No JSON object found in response');
  // find matching last } or ]
  const open = t[start];
  const close = open === '{' ? '}' : ']';
  const end = t.lastIndexOf(close);
  if (end < 0 || end < start) throw new Error('Malformed JSON in response');
  const slice = t.slice(start, end + 1);
  return JSON.parse(slice);
}
