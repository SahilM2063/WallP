// Stand-in for the Expo CLI during Gradle's release bundling.
// On Windows, React Native's Gradle plugin passes --entry-file relative to this app, but
// Expo resolves a relative entry against the Metro server root, which in this monorepo is
// the workspace root. Re-express the entry relative to that root, then hand over to Expo.
const path = require('path');
const { getMetroServerRoot } = require('@expo/config/paths');

const at = process.argv.indexOf('--entry-file');
if (at > -1 && process.argv[at + 1]) {
  const entry = path.resolve(process.cwd(), process.argv[at + 1]);
  process.argv[at + 1] = path.relative(getMetroServerRoot(process.cwd()), entry);
}
require(require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] }));
