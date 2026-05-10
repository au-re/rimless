import { guest } from "../../../src/index";

type HostApi = {
  doSomething: (input: { msg: string }) => Promise<string>;
};

type AsyncFunction = new (...args: string[]) => (doSomething: HostApi["doSomething"]) => Promise<unknown>;

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as AsyncFunction;

let hostApi: HostApi | null = null;

const api = {
  execute: async ({ code }: { code: string }) => {
    if (!hostApi) {
      return { result: null, error: "The host API is not ready yet." };
    }

    try {
      const run = new AsyncFunction("doSomething", code);
      const res = await run(hostApi.doSomething);
      return { result: res, error: null };
    } catch (error: any) {
      return {
        result: null,
        error: JSON.stringify(error.message || error) || "Something went wrong running the code",
      };
    }
  },
};

const run = async () => {
  try {
    const connection = await guest.connect(api);
    hostApi = { doSomething: connection.remote.doSomething };
  } catch (error: any) {
    console.error({ runError: JSON.stringify(error.message || error) });
  }
};

run();
