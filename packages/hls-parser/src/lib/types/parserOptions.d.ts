import type { SharedState } from './sharedState';
import type { Define } from './parsedPlaylist';

export type WarnCallback = (warn: string) => void;
export type DebugCallback = (...debug: Array<unknown>) => void;

export type CustomTagMap = Record<
  string,
  (
    tagKey: string,
    tagValue: string | null,
    tagAttributes: Record<string, string>,
    custom: Record<string, unknown>,
    sharedState: SharedState
  ) => void
>;

export type TransformTagValue = (tagKey: string, tagValue: string | null) => string | null;
export type TransformTagAttributes = (tagKey: string, tagAttributes: Record<string, string>) => Record<string, string>;

// used in the parser's constructor
export interface ParserOptions {
  warnCallback?: WarnCallback;
  debugCallback?: DebugCallback;
  customTagMap?: CustomTagMap;
  ignoreTags?: Set<string>;
  transformTagValue?: TransformTagValue;
  transformTagAttributes?: TransformTagAttributes;
}

// used in the parse methods (eg parseFullPlaylistString, parseFullPlaylistBuffer, pushBuffer, pushString)
export interface ParseOptions {
  baseUrl: string;
  baseDefine?: Define;
  baseTime?: number;
}
