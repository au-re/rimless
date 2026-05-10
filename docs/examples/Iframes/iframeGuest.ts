import { guest } from "../../../src/index";

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
    helloFrom: `iframe:${makeRandomColor()}`,
    makeRandomColor,
    setColor: (color: string) => {
      document.body.style.background = color;
    },
  });

  document.getElementById("connection")?.classList.add("connected");

  const button = document.getElementById("btn");
  if (button) {
    button.onclick = () => {
      connection.remote.setColor(makeRandomColor());
    };
  }
}

connect().catch((error) => {
  console.error("Error connecting iframe guest", error);
});
