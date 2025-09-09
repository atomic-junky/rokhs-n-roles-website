import { stegaClean } from '@sanity/client/stega';

export function getCleanClassName(input) {
  return stegaClean(input);
}