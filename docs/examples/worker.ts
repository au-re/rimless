import guest from "../../src/guest";

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
      },
      {
        onConnectionSetup: async (config) => {
          console.log("Connection setup with config:", config);
          (self as any).config = config;
        },
      }
    );
  } catch (e) {
    console.error(e);
  }
};

run();
