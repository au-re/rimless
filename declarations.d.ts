declare module "*?worker&inline" {
  const WorkerFactory: {
    new (): Worker;
  };
  export default WorkerFactory;
}

declare module "*?worker" {
  const WorkerFactory: {
    new (): Worker;
  };
  export default WorkerFactory;
}

declare module "*.html?raw" {
  const content: string;
  export default content;
}

declare module "*.html" {
  const content: string;
  export default content;
}
