/**
 * @file What the card specs read off a drawn card, so a test says what it checks rather than how
 * to dig it out of the SVG.
 */

import { cssToObject } from '@uppercod/css-to-object';

/**
 * Puts a card into the document.
 *
 * @returns The card's root `<svg>`.
 */
const draw = (svg: string): SVGSVGElement => {
  document.body.innerHTML = svg;
  const root = document.querySelector('svg');
  if (!root) {
    throw new Error('no <svg> was drawn');
  }
  return root;
};

/**
 * A declaration of the drawn card's light-mode rule for `selector`.
 *
 * @returns The value as written, or `undefined` when the rule does not declare it.
 */
const cssValue = (selector: string, property: string): string | undefined =>
  cssToObject(document.querySelector('style')?.textContent ?? '')[':host']?.[`${selector} `]?.[
    property
  ]?.trim();

/** @returns A `toHaveTextContent` matcher for `text` alone, which a plain string matches inside. */
const exactly = (text: string): RegExp => new RegExp(`^${RegExp.escape(text)}$`, 'u');

export { cssValue, draw, exactly };
