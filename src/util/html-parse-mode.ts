import { Transformer } from 'grammy';
import { InputMedia } from 'grammy/types';

export const htmlParseMode: Transformer = (prev, method, payload, signal) => {
  if (!payload || 'parse_mode' in payload) {
    return prev(method, payload, signal);
  }

  const isInputMedia = (media: unknown): media is InputMedia => {
    return (
      typeof media === 'object' &&
      media !== null &&
      'type' in media &&
      'media' in media
    );
  };

  if (
    method === 'editMessageMedia' &&
    'media' in payload &&
    isInputMedia(payload.media) &&
    !('parse_mode' in payload.media)
  ) {
    payload.media.parse_mode = 'HTML';
  } else {
    payload = { ...payload, ...{ parse_mode: 'HTML' } };
  }

  return prev(method, payload, signal);
};
