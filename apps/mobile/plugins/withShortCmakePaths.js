const { withAppBuildGradle } = require('expo/config-plugins');

// Keep Windows Ninja object paths below MAX_PATH without moving the workspace.
// This is reproduced by prebuild, rather than a manual generated-file change.
module.exports = (config) =>
  withAppBuildGradle(config, (result) => {
    const marker = '// wallp: short native build paths';
    result.modResults.contents = result.modResults.contents.replace(
      /\/\/ wallp: short native build paths\r?\nandroid \{[\s\S]*?\r?\n\}\r?\n/,
      '',
    );
    if (!result.modResults.contents.includes(marker)) {
      result.modResults.contents += `
${marker}
android {
  defaultConfig {
    externalNativeBuild {
      cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=250" }
    }
  }
  externalNativeBuild {
    cmake { buildStagingDirectory file("../../../../.cxx") }
  }
}
`;
    }
    return result;
  });
