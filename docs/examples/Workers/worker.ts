import { guest } from "../../../src/index";

function createColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getMessage() {
  return "Hello from the worker! Initialized with:" + (self as any).config?.initialValue;
}

const run = async () => {
  try {
    await guest.connect(
      {
        createColor,
        getMessage,
        helloFrom: "worker",
      },
      {
        onConnectionSetup: async (config) => {
          (self as any).config = config;
        },
      },
    );
  } catch (e) {
    console.error(e);
  }
};

run();
