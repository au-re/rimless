import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

const rimlessBundle = await readFile(new URL("../../lib/rimless.min.js", import.meta.url), "utf8");
const scriptBundle = rimlessBundle.replace(/<\/script/gi, "<\\/script");

const childHtml = `<!doctype html>
<html>
  <body>
    <script>${scriptBundle}</script>
    <script>
      (async () => {
        parent.postMessage({ type: "child-loaded" }, "*");
        const connection = await rimless.guest.connect({
          guestEcho: (value) => \`guest:\${value}\`,
        });
        parent.postMessage({ type: "child-connected" }, "*");
        window.addEventListener("message", async (event) => {
          if (event.data?.type !== "call-host") return;

          try {
            const hostResult = await connection.remote.hostEcho("child");
            parent.postMessage({ type: "child-result", value: hostResult }, "*");
          } catch (error) {
            parent.postMessage({ type: "child-error", message: error?.stack || String(error) }, "*");
          }
        });
      })().catch((error) => {
        parent.postMessage({ type: "child-error", message: error?.stack || String(error) }, "*");
      });
    </script>
  </body>
</html>`;

const childUrl = `data:text/html;charset=utf-8,${encodeURIComponent(childHtml)}`;

const parentHtml = `<!doctype html>
<html>
  <body>
    <script>${scriptBundle}</script>
    <script>
      const childUrl = ${JSON.stringify(childUrl)};
      const status = [];

      function recordStatus(value) {
        status.push(value);
        document.body.dataset.status = status.join("|");
      }

      window.addEventListener("error", (event) => {
        recordStatus(\`error:\${event.message}\`);
      });

      window.addEventListener("unhandledrejection", (event) => {
        recordStatus(\`rejection:\${event.reason?.stack || event.reason}\`);
      });

      function createChildMessageWaiter(iframe) {
        const waiters = new Map();

        window.addEventListener("message", (event) => {
            if (event.source !== iframe.contentWindow) return;

            recordStatus(\`\${event.origin}:\${event.data?.type || event.data?.action}:\${event.data?.callName || ""}\`);

            if (event.data?.type === "child-error") {
              for (const waiter of waiters.values()) {
                waiter.reject(new Error(event.data.message));
              }
              waiters.clear();
              return;
            }

            const waiter = waiters.get(event.data?.type);
            if (waiter) {
              waiters.delete(event.data.type);
              waiter.resolve(event.data.value);
            }
          });

        return (type) =>
          new Promise((resolve, reject) => {
            waiters.set(type, { resolve, reject });
          });
      }

      async function runTest() {
        const iframe = document.createElement("iframe");
        iframe.sandbox.add("allow-scripts");
        iframe.src = childUrl;

        recordStatus("host-connect-start");
        const waitForChildMessage = createChildMessageWaiter(iframe);
        const childConnectedPromise = waitForChildMessage("child-connected");
        const childResultPromise = waitForChildMessage("child-result");
        const hostConnectionPromise = rimless.host.connect(iframe, {
          hostEcho: (value) => \`host:\${value}\`,
        });

        document.body.append(iframe);
        recordStatus("iframe-appended");

        const hostConnection = await hostConnectionPromise;
        recordStatus("host-connected");
        await childConnectedPromise;

        const guestResult = await hostConnection.remote.guestEcho("parent");

        if (guestResult !== "guest:parent") {
          throw new Error(\`Unexpected guest result: \${guestResult}\`);
        }

        iframe.contentWindow.postMessage({ type: "call-host" }, "*");
        recordStatus("parent-sent-call-host");

        const childResult = await childResultPromise;

        if (childResult !== "host:child") {
          throw new Error(\`Unexpected child result: \${childResult}\`);
        }

        hostConnection.close();
        document.body.dataset.result = "pass";
        document.body.textContent = "RIMLESS_OPAQUE_ORIGIN_PASS";
      }

      Promise.race([
        runTest(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for iframe RPC")), 10000)),
      ]).catch((error) => {
        document.body.dataset.result = "fail";
        document.body.textContent = \`RIMLESS_OPAQUE_ORIGIN_FAIL: \${status.join("|")}: \${error?.stack || error}\`;
      });
    </script>
  </body>
</html>`;

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getOpenPort() {
  const server = createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function waitForDebugTarget(debugPort, url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const target = targets.find((entry) => entry.type === "page" && entry.url === url);

      if (target?.webSocketDebuggerUrl) {
        return target;
      }
    } catch (_error) {
      // Chrome may need a moment to open the debugging endpoint.
    }

    await delay(100);
  }

  throw new Error("Timed out waiting for Chrome debugging target");
}

function connectToTarget(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;

    socket.addEventListener("open", () => {
      resolve({
        close: () => socket.close(),
        send: (method, params = {}) =>
          new Promise((sendResolve, sendReject) => {
            const id = nextId++;
            pending.set(id, { resolve: sendResolve, reject: sendReject });
            socket.send(JSON.stringify({ id, method, params }));
          }),
      });
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;

      const request = pending.get(message.id);
      if (!request) return;

      pending.delete(message.id);

      if (message.error) {
        request.reject(new Error(message.error.message));
        return;
      }

      request.resolve(message.result);
    });

    socket.addEventListener("error", reject);
  });
}

function launchChrome(chromePath, debugPort, userDataDir, url) {
  const browser = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      url,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderr = "";
  browser.stderr.setEncoding("utf8");
  browser.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  return {
    process: browser,
    stderr: () => stderr,
    close: () => {
      if (!browser.killed) {
        browser.kill();
      }
    },
  };
}

const chromePath = findChrome();

if (!chromePath) {
  console.error("Could not find Chrome or Chromium. Set CHROME_BIN to run the browser integration test.");
  process.exit(1);
}

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(parentHtml);
});

const port = await listen(server);
const url = `http://127.0.0.1:${port}/`;
const debugPort = await getOpenPort();
const userDataDir = await mkdtemp(path.join(tmpdir(), "rimless-browser-"));
let browser;
let target;

try {
  browser = launchChrome(chromePath, debugPort, userDataDir, url);
  const debugTarget = await waitForDebugTarget(debugPort, url);
  target = await connectToTarget(debugTarget.webSocketDebuggerUrl);

  await target.send("Runtime.enable");

  const startedAt = Date.now();
  let pageState = {};

  while (Date.now() - startedAt < 12000) {
    const evaluation = await target.send("Runtime.evaluate", {
      expression:
        "({ result: document.body.dataset.result || '', status: document.body.dataset.status || '', text: document.body.textContent || '' })",
      returnByValue: true,
    });

    pageState = evaluation.result.value;

    if (pageState.result === "pass") {
      console.log("Opaque-origin iframe browser integration passed in Chrome/Chromium.");
      process.exitCode = 0;
      break;
    }

    if (pageState.result === "fail") {
      throw new Error(pageState.text);
    }

    await delay(100);
  }

  if (pageState.result !== "pass") {
    throw new Error(`Timed out waiting for browser test result: ${pageState.status || "no status"}`);
  }
} finally {
  target?.close();
  browser?.close();
  await rm(userDataDir, { recursive: true, force: true });
  await close(server);
}
