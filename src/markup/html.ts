/**
 * What XML cannot carry even as a reference: the C0 controls but tab, newline and return, and the
 * two non-characters U+FFFE and U+FFFF.
 */
const NOT_XML = String.raw`\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF`;

/**
 * What has to be encoded: the markup characters, everything above plain ASCII, and what XML cannot
 * carry. One source for every regex, so the check and the replacement cannot disagree.
 */
const ENCODED = String.raw`[<>&"'\u00A0-\u9999${NOT_XML}]`;

/** Non-global, so `.test` stays stateless: a global regex would carry `lastIndex`. */
const NEEDS_ENCODING = new RegExp(ENCODED);
const TO_ENCODE = new RegExp(ENCODED, 'g');

/** One such character would leave the whole card malformed, so each is dropped. */
const DROPPED = new RegExp(`[${NOT_XML}]`);

/**
 * Encodes a string for use as markup, one numeric character reference each.
 *
 * The serializer is now the only place text becomes markup, so nothing arrives pre-escaped:
 * a literal `&#38;` is encoded like any other `&` rather than passed through as a reference.
 *
 * @see https://stackoverflow.com/a/48073476/10629172
 *
 * @returns The text, safe to place in an attribute or as character data.
 */
const encodeHTML = (str: string): string => {
  // Most strings a card writes are plain ASCII, so they leave without a rewrite.
  if (!NEEDS_ENCODING.test(str)) {
    return str;
  }

  return str.replaceAll(TO_ENCODE, (char) =>
    DROPPED.test(char) ? '' : `&#${char.codePointAt(0) ?? 0};`,
  );
};

export { encodeHTML };
