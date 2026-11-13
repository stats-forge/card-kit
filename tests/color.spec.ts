import { describe, expect, it } from 'vitest';

import { parseThemeParams } from '../src/api/params.ts';
import { HEAT_PAINT, cardGround, getCardColors, getLightDarkColors, inkOn } from '../src/color.ts';
import { CardError } from '../src/error.ts';
import { themes } from '../src/themes/index.ts';

describe(getCardColors, () => {
  it("should draw with the theme's own colors", () => {
    const { heat } = themes.cobalt_light;
    expect(getCardColors('cobalt_light')).toStrictEqual({
      heat: [`#${heat[0]}`, `#${heat[1]}`, `#${heat[2]}`],
      titleColor: `#${heat[1]}`,
      iconColor: `#${heat[1]}`,
      textColor: `#${themes.cobalt_light.text_color}`,
      bgColor: `#${themes.cobalt_light.bg_color}`,
      borderColor: `#${heat[1]}4d`,
      ringColor: HEAT_PAINT.ring,
      progBarBgColor: '#ddd',
      glowOpacity: 0.05,
      bandOpacity: 0.05,
    });
  });

  it('should fall back to ember_light for an unknown name, or none', () => {
    expect(getCardColors('invalidTheme')).toStrictEqual(getCardColors('ember_light'));
    expect(getCardColors('toString')).toStrictEqual(getCardColors('ember_light'));
    expect(getCardColors('ember')).toStrictEqual(getCardColors('ember_light'));
    expect(getCardColors()).toStrictEqual(getCardColors('ember_light'));
  });

  it('should keep a border the theme names', () => {
    expect(getCardColors('transparent').borderColor).toBe(`#${themes.transparent.border_color}`);
  });

  it('should glow hotter, and draw a lighter track, on a dark background', () => {
    expect(getCardColors('ember_dark').glowOpacity).toBe(0.13);
    expect(getCardColors('ember_dark').progBarBgColor).toBe('#ffffff33');
    expect(getCardColors('transparent').glowOpacity).toBe(0.08);
    expect(getCardColors('transparent').progBarBgColor).toBe('#8b949e59');
  });
});

describe('quiet themes', () => {
  it('should drop the glow and halve the band, against the same tone in the forge', () => {
    const quiet = getCardColors('classic');
    const forge = getCardColors('ember_light');
    expect(quiet.glowOpacity).toBe(0);
    expect(quiet.bandOpacity).toBeCloseTo(forge.bandOpacity / 2);
    expect(getCardColors('nord').glowOpacity).toBe(0);
  });
});

describe(getLightDarkColors, () => {
  it('should follow the viewer in ember when no theme is named', () => {
    const { lightColors, darkColors } = getLightDarkColors({});
    expect(lightColors).toStrictEqual(getCardColors('ember_light'));
    expect(darkColors).toStrictEqual(getCardColors('ember_dark'));
  });

  it('should carry one palette for one name', () => {
    const { lightColors, darkColors } = getLightDarkColors({ theme: 'brass_dark' });
    expect(lightColors).toStrictEqual(getCardColors('brass_dark'));
    expect(darkColors).toBeNull();
  });

  it('should draw the first of a pair in light mode and the second in dark', () => {
    const { lightColors, darkColors } = getLightDarkColors({ theme: 'cobalt_dark,github_light' });
    expect(lightColors).toStrictEqual(getCardColors('cobalt_dark'));
    expect(darkColors).toStrictEqual(getCardColors('github_light'));
  });

  it('should carry one palette for a pair naming one theme twice', () => {
    expect(getLightDarkColors({ theme: 'verdigris_dark,verdigris_dark' }).darkColors).toBeNull();
  });
});

describe(cardGround, () => {
  it('should name the one background a card stands on, or the viewer when it carries both', () => {
    expect(cardGround({})).toBe('viewer');
    expect(cardGround({ theme: 'brass_light,magma_dark' })).toBe('viewer');
    expect(cardGround({ theme: 'cobalt_dark' })).toBe('dark');
    expect(cardGround({ theme: 'cobalt_light' })).toBe('light');
    expect(cardGround({ theme: 'transparent' })).toBe('translucent');
  });
});

/**
 * @returns The theme the schema yields, or the param it rejected.
 */
const parsedTheme = (theme: string): string | undefined => {
  try {
    return parseThemeParams({ theme }).theme;
  } catch (error) {
    return error instanceof CardError ? `rejected ${String(error.param)}` : undefined;
  }
};

describe(parseThemeParams, () => {
  it('should accept one name or a pair, in the table spelling', () => {
    expect(parsedTheme('Ember_Light')).toBe('ember_light');
    expect(parsedTheme('BRASS_LIGHT, magma_dark')).toBe('brass_light,magma_dark');
  });

  it('should reject an unknown name, or more than two', () => {
    expect(parsedTheme('ember')).toBe('rejected theme');
    expect(parsedTheme('ember_light,nope')).toBe('rejected theme');
    expect(parsedTheme('ember_light,cobalt_dark,brass_dark')).toBe('rejected theme');
  });

  it('should pick only the theme off a query', () => {
    expect(
      parseThemeParams({ theme: 'ember_dark', title_color: 'fff', username: 'x' }),
    ).toStrictEqual({ theme: 'ember_dark' });
  });
});

describe(inkOn, () => {
  const colors = getCardColors('ember_light');

  it("keeps the theme's own ink while it reads on the fill", () => {
    expect(inkOn(colors, colors.bgColor, 1)).toBe(colors.textColor);
  });

  it("reaches for the theme's background when the text color would not read", () => {
    expect(inkOn(colors, colors.textColor, 1)).toBe(colors.bgColor);
  });

  it('falls back to black or white when neither of its own reads', () => {
    expect(inkOn(colors, '#e2470f', 1)).toBe('#000000');
    expect(inkOn(getCardColors('transparent'), '#5a0f9a', 1)).toBe('#ffffff');
  });

  it('reads on both pages a translucent card may stand on', () => {
    const translucent = getCardColors('transparent');

    expect(inkOn(translucent, '#000000', 1)).toBe(translucent.textColor);
    expect(inkOn(translucent, '#ffffff', 1)).toBe('#000000');
  });
});
