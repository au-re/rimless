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

const run = async () => {
  await guest.connect(api);
};

run();
