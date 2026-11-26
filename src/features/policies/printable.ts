// The receipt PDF uses the built-in PDF fonts, which only cover the Windows-1252
// character set. Anything else comes out as unrelated symbols, which is not
// acceptable in a document kept as evidence. Free of server imports.

/** Printable beyond ASCII and Latin-1: the rest of Windows-1252. */
const EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

function isPrintable(char: string): boolean {
  const code = char.codePointAt(0) as number;
  return char === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || EXTRA.has(char);
}

/** Tidies look-alike characters that come along when text is pasted from a word
 * processor, without changing what the text says. */
export function toPrintable(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g, "")
    .replace(/[\t\u2000-\u200a\u202f\u205f\u3000]/g, " ")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\u2010\u2011\u2012\u2212]/g, "-");
}

/** The distinct characters that would still not print, in order of appearance. */
export function unprintableCharacters(text: string): string[] {
  return [...new Set(Array.from(toPrintable(text)).filter((char) => !isPrintable(char)))];
}

/** For text nobody can be asked to retype, such as a name from an account:
 * accents the fonts lack are dropped, and so is whatever has no base letter. */
export function bestEffortPrintable(text: string): string {
  return Array.from(toPrintable(text))
    .map((char) => {
      if (isPrintable(char)) return char;
      return Array.from(char.normalize("NFKD")).filter(isPrintable).join("");
    })
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
}
