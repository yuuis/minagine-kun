import * as functions from 'firebase-functions';

export const runtimeOpts = {
  timeoutSeconds: 60,
  memory: '512MB',
} as functions.RuntimeOptions;
