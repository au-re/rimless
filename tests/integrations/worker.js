importScripts("./rimless.min.js")

const { guest } = rimless;

function makeRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

async function connect() {
  const connection = await guest.connect({
    name: "worker",
    makeRandomColor,
  });
  connection.remote.setColor(makeRandomColor());
}

connect();



