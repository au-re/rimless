/// <reference types="vite/client" />

declare module "*.html" {
  const content: any;
  export default content;
}
