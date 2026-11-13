/**
 * @file Everything a package of cards draws with: the frame, the themes, the text, the errors and
 * the api boundary a query string is parsed at.
 */

export { atRule, changedBy, cssComment, el, renderMarkup, rule, style } from './markup/index.ts';
export type { Attributes, Child, CssChild, MarkupElement } from './markup/index.ts';

export { DEFAULT_THEME, THEME_PARAM_VALUES, isThemeName, themes } from './themes/index.ts';
export type { Theme, ThemeName } from './themes/index.ts';

export {
  cardGround,
  getCardColors,
  getLightDarkColors,
  HEAT_ID,
  HEAT_PAINT,
  inkOn,
  isPrefixedHexColor,
} from './color.ts';
export type { CardColors, CardGround, ThemeParams } from './color.ts';

export { CARD_STYLE, firefoxFontSize, font } from './brand.ts';
export { Card, titleFits } from './Card.ts';
export { icons } from './icons.ts';
export { measureText, splitWrappedText, wrapTextMultiline } from './text.ts';
export {
  clampPrecision,
  compactColumnWidth,
  countFormatter,
  createLanguageNode,
  createProgressNode,
  createTextNode,
  flexLayout,
  glowingCircle,
  iconWithLabel,
  NUMBER_FORMATS,
  renderError,
} from './render.ts';
export type { NumberFormat } from './render.ts';
export { formatBytes, formatDecimal, kFormatter } from './fmt.ts';
export { clampValue, parseArray } from './ops.ts';

export {
  AVAILABLE_LOCALES,
  defineLocales,
  intlTag,
  LOCALE_ALIASES,
  localize,
  resolveLocale,
} from './localize.ts';
export type { Locale, LocaleTable, Localized } from './localize.ts';

export { consoleLogger } from './log.ts';
export type { Logger } from './log.ts';
export { defaultFetch, httpRequest, withTimeout } from './http.ts';
export type { FetchLike, HttpResponse } from './http.ts';
export { CardError, registerFailures, TRY_AGAIN_LATER } from './error.ts';
export type { ErrorCode, Failure, FailureReason, Failures } from './error.ts';

export { errorResult } from './api/api-result.ts';
export type { ApiError, ApiResult } from './api/api-result.ts';
export { cardHandlerFor } from './api/handler.ts';
export type {
  AllowlistKindOf,
  CardEndpoint,
  CardHandler,
  HandlerConfig,
  Identities,
} from './api/handler.ts';
export { queryOf } from './api/query.ts';
export {
  booleanParam,
  commonParams,
  describeParams,
  enumListParam,
  enumParam,
  intParam,
  kinded,
  listParam,
  numberParam,
  parseParams,
  parseThemeParams,
  patternParam,
  rawParam,
  readBoolean,
  rejects,
  resolveEmpty,
  safeListParam,
  safeParam,
  statRowParams,
  titleParams,
  wordedAs,
} from './api/params.ts';
export type { ApiQuery, ParamKind, ParamShape, RejectionWording } from './api/params.ts';
