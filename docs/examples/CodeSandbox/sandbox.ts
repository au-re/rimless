import { guest } from "../../../src/index";

const api = {
  execute: async ({ code }: { code: string }) => {
    try {
      const res = await eval(code);
      return { success: JSON.stringify(res) };
    } catch (error: any) {
      return {
        success: null,
        error: JSON.stringify(error.message || error) || "Something went wrong running the code",
      };
    }
  },
};

const run = async () => {
  try {
    const connection = await guest.connect(api);

    // allow code to trigger events in the host
    (self as any).doSomething = connection.remote.doSomething;
  } catch (error: any) {
    console.error({ runError: JSON.stringify(error.message || error) });
  }
};

run();
