import { guest } from "../../../src/index";

const api = {
  user: {
    profile: {
      async get() {
        return { name: "Alice", age: 30 };
      },
    },
  },
};

async function getHostMessageExample(remote: any) {
  const msg = await remote.getHostMessage();
  return `Worker received: ${msg}`;
}

const run = async () => {
  await guest.connect(
    { ...api, getHostMessageExample },
    {
      onConnectionSetup: async () => {},
    },
  );
};

run();
