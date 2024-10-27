declare module "*.html?raw" {
  const content: any;
  export default content;
}

declare module "*?worker" {
  const WorkerFactory: {
    new (): Worker;
  };
  export default WorkerFactory;
}
