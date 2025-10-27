import { guest, withTransferable } from "../../../src/index";

const api = {
  /**
   * Receive a file from the host, inspect it and send a processed copy back.
   */
  async analyzeFile({ name, buffer }: { name: string; buffer: ArrayBuffer }) {
    const bytes = new Uint8Array(buffer);
    const previewBytes = Array.from(bytes.slice(0, 8));
    const preview = previewBytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ");

    return withTransferable((transfer) => ({
      summary: `Processed ${name} (${bytes.byteLength} bytes).\nFirst bytes: ${preview || "n/a"}`,
      buffer: transfer(buffer),
    }));
  },
};

const run = async () => {
  await guest.connect(api);
};

run();
