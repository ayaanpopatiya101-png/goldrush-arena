const pictographs =
  /[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu;
export function cleanCopy(value: string): string {
  return value
    .replace(pictographs, "")
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/ {2,}/g, " ")
    .replace(/!+/g, "");
}
