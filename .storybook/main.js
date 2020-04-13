module.exports = {
  stories: ["../docs/**/*.stories.tsx", "../docs/**/*.stories.mdx"],
  addons: ["@storybook/addon-docs"],
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve("awesome-typescript-loader"),
          options: {
            configFileName: "./tsconfig.dev.json",
            transpileOnly: true,
            useCache: true,
          },
        }
      ],
    });
    config.resolve.extensions.push(".ts", ".tsx");
    return config;
  },
};
