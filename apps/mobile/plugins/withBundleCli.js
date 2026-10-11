const { withAppBuildGradle } = require('expo/config-plugins');

// Route Gradle's JS bundling through ./bundleCli.js so release builds work from this
// monorepo on Windows. Reproduced by prebuild, rather than a manual generated-file change.
module.exports = (config) =>
  withAppBuildGradle(config, (result) => {
    result.modResults.contents = result.modResults.contents.replace(
      /^(\s*)cliFile = .*$/m,
      '$1cliFile = file("../../plugins/bundleCli.js")',
    );
    return result;
  });
