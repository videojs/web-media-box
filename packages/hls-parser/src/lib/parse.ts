import createStateMachine from './stateMachine';
import type { StateMachineTransition } from './stateMachine';
import {
  failedToResolveUri,
  ignoreTagWarn,
  missingRequiredVariableForUriSubstitutionWarn,
  missingTagValueWarn,
  segmentDurationExceededTargetDuration,
  unsupportedTagWarn,
} from './utils/warn';

import {
  EXT_X_DEFINE,
  EXT_X_DISCONTINUITY_SEQUENCE,
  EXT_X_ENDLIST,
  EXT_X_I_FRAMES_ONLY,
  EXT_X_INDEPENDENT_SEGMENTS,
  EXT_X_MEDIA_SEQUENCE,
  EXT_X_PART_INF,
  EXT_X_PLAYLIST_TYPE,
  EXT_X_SERVER_CONTROL,
  EXT_X_START,
  EXT_X_TARGETDURATION,
  EXT_X_VERSION,
  EXTINF,
  EXT_X_BYTERANGE,
  EXT_X_DISCONTINUITY,
  EXT_X_KEY,
  EXT_X_MAP,
  EXT_X_GAP,
  EXT_X_BITRATE,
  EXT_X_PART,
  EXT_X_PROGRAM_DATE_TIME,
  EXT_X_MEDIA,
  EXT_X_STREAM_INF,
  EXT_X_SKIP,
  EXT_X_I_FRAME_STREAM_INF,
  EXT_X_DATERANGE,
  EXT_X_PRELOAD_HINT,
  EXT_X_RENDITION_REPORT,
  EXT_X_SESSION_DATA,
  EXTM3U,
  EXT_X_SESSION_KEY,
  EXT_X_CONTENT_STEERING,
} from './consts/tags';
import type {
  CustomTagMap,
  DebugCallback,
  ParseOptions,
  ParserOptions,
  TransformTagAttributes,
  TransformTagValue,
  WarnCallback,
} from './types/parserOptions';
import type { ParsedPlaylist } from './types/parsedPlaylist';
import type { SharedState } from './types/sharedState';
import type { EmptyTagProcessor } from './tags/emptyTagProcessors';
import {
  ExtXEndList,
  ExtXIframesOnly,
  ExtXIndependentSegments,
  ExtXDiscontinuity,
  ExtXGap,
  ExtM3u,
} from './tags/emptyTagProcessors';
import type { TagWithValueProcessor } from './tags/tagWithValueProcessors';
import {
  ExtXBitrate,
  ExtXByteRange,
  ExtInf,
  ExtXDiscontinuitySequence,
  ExtXMediaSequence,
  ExtXPlaylistType,
  ExtXTargetDuration,
  ExtXVersion,
  ExtXProgramDateTime,
} from './tags/tagWithValueProcessors';
import type { TagWithAttributesProcessor } from './tags/tagWithAttributesProcessors';
import {
  ExtXPartInf,
  ExtXServerControl,
  ExtXStart,
  ExtXKey,
  ExtXMap,
  ExtXPart,
  ExtXMedia,
  ExtXStreamInf,
  ExtXSkip,
  ExtXIFrameStreamInf,
  ExtXDateRange,
  ExtXPreloadHint,
  ExtXRenditionReport,
  ExtXSessionData,
  ExtXSessionKey,
  ExtXContentSteering,
  ExtXDefine,
} from './tags/tagWithAttributesProcessors';
import {
  createDefaultParsedPlaylist,
  createDefaultSegment,
  createDefaultSharedState,
  createDefaultVariantStream,
} from './consts/defaults';
import { resolveUri, substituteVariables } from './utils/parse';

class Parser {
  private readonly warnCallback: WarnCallback;
  private readonly debugCallback: DebugCallback;
  private readonly customTagMap: CustomTagMap;
  private readonly ignoreTags: Set<string>;
  private readonly transformTagValue: TransformTagValue;
  private readonly transformTagAttributes: TransformTagAttributes;
  private readonly emptyTagMap: Record<string, EmptyTagProcessor>;
  private readonly tagValueMap: Record<string, TagWithValueProcessor>;
  private readonly tagAttributesMap: Record<string, TagWithAttributesProcessor>;

  protected parsedPlaylist: ParsedPlaylist;
  protected sharedState: SharedState;

  public constructor(options: ParserOptions) {
    this.warnCallback = options.warnCallback || ((): void => {});
    this.debugCallback = options.debugCallback || ((): void => {});
    this.customTagMap = options.customTagMap || {};
    this.ignoreTags = options.ignoreTags || new Set();
    this.transformTagValue = options.transformTagValue || ((tagKey, tagValue): string | null => tagValue);
    this.transformTagAttributes =
      options.transformTagAttributes || ((tagKey, tagAttributes): Record<string, string> => tagAttributes);

    this.parsedPlaylist = createDefaultParsedPlaylist();
    this.sharedState = createDefaultSharedState();

    this.emptyTagMap = {
      [EXTM3U]: new ExtM3u(this.warnCallback),
      [EXT_X_INDEPENDENT_SEGMENTS]: new ExtXIndependentSegments(this.warnCallback),
      [EXT_X_ENDLIST]: new ExtXEndList(this.warnCallback),
      [EXT_X_I_FRAMES_ONLY]: new ExtXIframesOnly(this.warnCallback),
      [EXT_X_DISCONTINUITY]: new ExtXDiscontinuity(this.warnCallback),
      [EXT_X_GAP]: new ExtXGap(this.warnCallback),
    };

    this.tagValueMap = {
      [EXT_X_VERSION]: new ExtXVersion(this.warnCallback),
      [EXT_X_TARGETDURATION]: new ExtXTargetDuration(this.warnCallback),
      [EXT_X_MEDIA_SEQUENCE]: new ExtXMediaSequence(this.warnCallback),
      [EXT_X_DISCONTINUITY_SEQUENCE]: new ExtXDiscontinuitySequence(this.warnCallback),
      [EXT_X_PLAYLIST_TYPE]: new ExtXPlaylistType(this.warnCallback),
      [EXTINF]: new ExtInf(this.warnCallback),
      [EXT_X_BYTERANGE]: new ExtXByteRange(this.warnCallback),
      [EXT_X_BITRATE]: new ExtXBitrate(this.warnCallback),
      [EXT_X_PROGRAM_DATE_TIME]: new ExtXProgramDateTime(this.warnCallback),
    };

    this.tagAttributesMap = {
      [EXT_X_START]: new ExtXStart(this.warnCallback),
      [EXT_X_PART_INF]: new ExtXPartInf(this.warnCallback),
      [EXT_X_SERVER_CONTROL]: new ExtXServerControl(this.warnCallback),
      [EXT_X_KEY]: new ExtXKey(this.warnCallback),
      [EXT_X_MAP]: new ExtXMap(this.warnCallback),
      [EXT_X_PART]: new ExtXPart(this.warnCallback),
      [EXT_X_MEDIA]: new ExtXMedia(this.warnCallback),
      [EXT_X_STREAM_INF]: new ExtXStreamInf(this.warnCallback),
      [EXT_X_SKIP]: new ExtXSkip(this.warnCallback),
      [EXT_X_I_FRAME_STREAM_INF]: new ExtXIFrameStreamInf(this.warnCallback),
      [EXT_X_DATERANGE]: new ExtXDateRange(this.warnCallback),
      [EXT_X_PRELOAD_HINT]: new ExtXPreloadHint(this.warnCallback),
      [EXT_X_RENDITION_REPORT]: new ExtXRenditionReport(this.warnCallback),
      [EXT_X_SESSION_DATA]: new ExtXSessionData(this.warnCallback),
      [EXT_X_SESSION_KEY]: new ExtXSessionKey(this.warnCallback),
      [EXT_X_CONTENT_STEERING]: new ExtXContentSteering(this.warnCallback),
      [EXT_X_DEFINE]: new ExtXDefine(this.warnCallback),
    };
  }

  protected readonly tagInfoCallback = (
    tagKey: string,
    tagValue: string | null,
    tagAttributes: Record<string, string>
  ): void => {
    this.debugCallback(`Received tag info from scanner: `, { tagKey, tagValue, tagAttributes });

    if (this.ignoreTags.has(tagKey)) {
      return this.warnCallback(ignoreTagWarn(tagKey));
    }

    //1. Process simple tags without values or attributes:
    if (tagKey in this.emptyTagMap) {
      const emptyTagProcessor = this.emptyTagMap[tagKey];
      return emptyTagProcessor.process(this.parsedPlaylist, this.sharedState);
    }

    //2. Process tags with values:
    if (tagKey in this.tagValueMap) {
      tagValue = this.transformTagValue(tagKey, tagValue);

      if (tagValue === null) {
        return this.warnCallback(missingTagValueWarn(tagKey));
      }

      const tagWithValueProcessor = this.tagValueMap[tagKey];
      return tagWithValueProcessor.process(tagValue, this.parsedPlaylist, this.sharedState);
    }

    //3. Process tags with attributes:
    if (tagKey in this.tagAttributesMap) {
      tagAttributes = this.transformTagAttributes(tagKey, tagAttributes);
      const tagWithAttributesProcessor = this.tagAttributesMap[tagKey];

      return tagWithAttributesProcessor.process(tagAttributes, this.parsedPlaylist, this.sharedState);
    }

    //4. Process custom tags:
    if (tagKey in this.customTagMap) {
      const customTagProcessor = this.customTagMap[tagKey];

      return customTagProcessor(tagKey, tagValue, tagAttributes, this.parsedPlaylist.custom, this.sharedState);
    }

    // 5. Unable to process received tag:
    this.warnCallback(unsupportedTagWarn(tagKey));
  };

  protected readonly uriInfoCallback = (uri: string): void => {
    if (this.sharedState.hasVariablesForSubstitution) {
      uri = substituteVariables(uri, this.parsedPlaylist.define, (variableName) => {
        this.warnCallback(missingRequiredVariableForUriSubstitutionWarn(uri, variableName));
      });
    }

    let resolvedUri = resolveUri(uri, this.sharedState.baseUrl);

    if (resolvedUri === null) {
      this.warnCallback(failedToResolveUri(uri, this.sharedState.baseUrl));
      resolvedUri = uri;
    }

    if (this.sharedState.isMultivariantPlaylist) {
      this.handleCurrentVariant(uri, resolvedUri);
    } else {
      this.handleCurrentSegment(uri, resolvedUri);
    }
  };

  private handleCurrentVariant(uri: string, resolvedUri: string): void {
    this.sharedState.currentVariant.uri = uri;
    this.sharedState.currentVariant.resolvedUri = resolvedUri;
    this.parsedPlaylist.variantStreams.push(this.sharedState.currentVariant);
    this.sharedState.currentVariant = createDefaultVariantStream();
  }

  private handleCurrentSegment(uri: string, resolvedUri: string): void {
    if (
      this.parsedPlaylist.targetDuration !== undefined &&
      this.sharedState.currentSegment.duration > this.parsedPlaylist.targetDuration
    ) {
      this.warnCallback(
        segmentDurationExceededTargetDuration(
          uri,
          this.sharedState.currentSegment.duration,
          this.parsedPlaylist.targetDuration
        )
      );
    }

    const previousSegment = this.parsedPlaylist.segments[this.parsedPlaylist.segments.length - 1];

    this.sharedState.currentSegment.encryption = this.sharedState.currentEncryption;
    this.sharedState.currentSegment.map = this.sharedState.currentMap;
    this.sharedState.currentSegment.uri = uri;
    this.sharedState.currentSegment.resolvedUri = resolvedUri;
    this.sharedState.currentSegment.startTime = this.sharedState.baseTime;

    if (previousSegment) {
      this.sharedState.currentSegment.mediaSequence = previousSegment.mediaSequence + 1;
      this.sharedState.currentSegment.startTime = previousSegment.endTime;

      if (this.sharedState.currentSegment.isDiscontinuity) {
        this.sharedState.currentSegment.discontinuitySequence = previousSegment.discontinuitySequence + 1;
      } else {
        this.sharedState.currentSegment.discontinuitySequence = previousSegment.discontinuitySequence;
      }
    }

    this.sharedState.currentSegment.endTime =
      this.sharedState.currentSegment.startTime + this.sharedState.currentSegment.duration;

    // Apply the EXT-X-BITRATE value from previous segments to this segment as well,
    // as long as it doesn't have an EXT-X-BYTERANGE tag applied to it.
    // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.4.8
    if (this.sharedState.currentBitrate && !this.sharedState.currentSegment.byteRange) {
      this.sharedState.currentSegment.bitrate = this.sharedState.currentBitrate;
    }

    // Extrapolate a program date time value from the previous segment's program date time
    if (!this.sharedState.currentSegment.programDateTimeStart && previousSegment?.programDateTimeStart) {
      this.sharedState.currentSegment.programDateTimeStart =
        previousSegment.programDateTimeStart + previousSegment.duration * 1000;
    }

    if (this.sharedState.currentSegment.programDateTimeStart) {
      this.sharedState.currentSegment.programDateTimeEnd =
        this.sharedState.currentSegment.programDateTimeStart + this.sharedState.currentSegment.duration * 1000;
    }

    this.parsedPlaylist.segments.push(this.sharedState.currentSegment);
    this.sharedState.currentSegment = createDefaultSegment();
  }

  protected clean(): ParsedPlaylist {
    const parsedPlaylist = this.parsedPlaylist;

    this.parsedPlaylist = createDefaultParsedPlaylist();
    this.sharedState = createDefaultSharedState();

    return parsedPlaylist;
  }

  protected transitionToNewLine(stateMachine: StateMachineTransition): void {
    stateMachine('\n');
  }

  protected gatherParseOptions(options: ParseOptions): void {
    this.sharedState.baseDefine = options.baseDefine;
    this.sharedState.baseUrl = options.baseUrl;
    this.sharedState.baseTime = options.baseTime || 0;
  }
}

export class FullPlaylistParser extends Parser {
  public static create(options: ParserOptions): FullPlaylistParser {
    return new FullPlaylistParser(options);
  }

  public parseFullPlaylistString(playlist: string, options: ParseOptions): ParsedPlaylist {
    this.gatherParseOptions(options);

    const stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(playlist[i]);
    }

    this.transitionToNewLine(stateMachine);

    return this.clean();
  }

  public parseFullPlaylistBuffer(playlist: Uint8Array, options: ParseOptions): ParsedPlaylist {
    this.gatherParseOptions(options);

    const stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(String.fromCharCode(playlist[i]));
    }

    this.transitionToNewLine(stateMachine);

    return this.clean();
  }
}

export class ProgressiveParser extends Parser {
  public static create(options: ParserOptions): ProgressiveParser {
    return new ProgressiveParser(options);
  }

  private stateMachine: StateMachineTransition | null = null;

  public pushString(chunk: string, options: ParseOptions): void {
    this.gatherParseOptions(options);

    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(chunk[i]);
    }
  }

  public pushBuffer(chunk: Uint8Array, options: ParseOptions): void {
    this.gatherParseOptions(options);

    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedPlaylist {
    if (this.stateMachine) {
      this.transitionToNewLine(this.stateMachine);
    }

    this.stateMachine = null;

    return this.clean();
  }
}
