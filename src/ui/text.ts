/** '{name}' o‘rniga personaj ismini qo‘yadi (faqat matn; mexanikaga ta’sir qilmaydi). */
export function fillName(text: string, name: string): string {
  return text.replaceAll('{name}', name);
}

/** Har safar bir xil, lekin qaror id’siga qarab aralashtirilgan tartib. */
export function stableShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
