/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  testEnvironmentOptions: {
    customExportConditions: ['require', 'react-native', 'react-native-plain-text-source'],
  },
  moduleNameMapper: {
    // Test code outside `src` (e.g. VRT scenarios importing `example-shared/src`)
    // imports the library by name; it is not linked into root node_modules.
    '^react-native-plain-text$': '<rootDir>/src/index',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/example-shared/node_modules',
    '<rootDir>/lib/',
    '<rootDir>/references/',
  ],
};
