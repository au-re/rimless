import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../docs/**/*.mdx"],
  addons: ["@storybook/addon-links", "@chromatic-com/storybook", "@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};
export default config;
