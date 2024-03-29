const skipProcessing = (tag: string, reason: string): string => `Skip processing ${tag}. Reason: ${reason}.`;

export const missingTagValueWarn = (tag: string): string => skipProcessing(tag, 'No tag value');

export const missingRequiredAttributeWarn = (tag: string, attribute: string): string =>
  skipProcessing(tag, `No required ${attribute} attribute`);

export const missingRequiredVariableForAttributeValueSubstitutionWarn = (
  tag: string,
  attribute: string,
  variableName: string
): string =>
  `${tag}: Unable to substitute variable for ${variableName} when processing the following attribute: ${attribute}`;

export const missingRequiredVariableForUriSubstitutionWarn = (uri: string, variableName: string): string =>
  `Unable to substitute variable for ${variableName} when processing the following uri: ${uri}`;

export const unsupportedTagWarn = (tag: string): string => skipProcessing(tag, 'Unsupported');

export const unableToParseValueWarn = (tag: string): string => skipProcessing(tag, 'Unable to parse tag value');

export const fallbackUsedWarn = (tag: string, fallback: string): string => `${tag}: Fallback used ${fallback}`;

export const failedToResolveUriAttribute = (
  tag: string,
  attribute: string,
  uriValue: string,
  baseUrl: string
): string => `${tag}: Failed to resolve ${attribute}. Value: ${uriValue}. Base URL: ${baseUrl}`;

export const failedToResolveUri = (uriValue: string, baseUrl: string): string =>
  `Failed to resolve ${uriValue}. Base URL: ${baseUrl}`;

export const unsupportedEnumValue = (tag: string, actual: string, required: Set<string>): string =>
  skipProcessing(tag, `received unsupported tag value: ${actual}. Possible values: ${Array.from(required).toString()}`);

export const ignoreTagWarn = (tag: string): string => skipProcessing(tag, 'Tag is included in the ignore list');

export const segmentDurationExceededTargetDuration = (
  segmentUri: string,
  segmentDuration: number,
  targetDuration: number
): string =>
  `Segment duration is more than target duration. Difference is ${
    segmentDuration - targetDuration
  }. Uri is ${segmentUri}`;
