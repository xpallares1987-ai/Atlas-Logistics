export function normalizeCarbonSearch(...parts: string[]) {
  return parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("und")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l");
}
