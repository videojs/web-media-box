// eslint-disable-next-line import/extensions
import base from '../../jest.config.base.js';

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  ...base,
  displayName: 'player',
  coverageDirectory: './coverage',
};

export default config;
