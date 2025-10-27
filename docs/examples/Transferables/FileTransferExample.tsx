import React from "react";

import { host, Connection, withTransferable } from "../../../src/index";
import Worker from "./worker?worker";

function FileTransferExample() {
  const [connection, setConnection] = React.useState<Connection | null>(null);
  const [status, setStatus] = React.useState("Select a file to send to the worker.");
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [downloadName, setDownloadName] = React.useState<string | null>(null);
  const downloadUrlRef = React.useRef<string | null>(null);
  const connectionRef = React.useRef<Connection | null>(null);

  const revokeDownloadUrl = React.useCallback(() => {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    setDownloadUrl(null);
    setDownloadName(null);
  }, []);

  React.useEffect(() => {
    const workerInstance = new Worker();
    let disposed = false;

    host.connect(workerInstance).then((conn) => {
      if (disposed) {
        conn.close();
        return;
      }
      connectionRef.current = conn;
      setConnection(conn);
      setStatus("Worker ready—pick a file to transfer.");
    });

    return () => {
      disposed = true;
      revokeDownloadUrl();
      connectionRef.current?.close();
      if (!connectionRef.current) {
        workerInstance.terminate();
      }
    };
  }, [revokeDownloadUrl]);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!connectionRef.current || !file) {
      return;
    }

    setStatus(`Sending ${file.name} to the worker...`);
    const buffer = await file.arrayBuffer();

    const response = (await connectionRef.current.remote.analyzeFile(
      withTransferable((transfer) => ({
        name: file.name,
        buffer: transfer(buffer),
      })),
    )) as { summary: string; buffer: ArrayBuffer };

    revokeDownloadUrl();

    const blob = new Blob([response.buffer], { type: "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    downloadUrlRef.current = objectUrl;
    setDownloadUrl(objectUrl);
    setDownloadName(`${file.name}.copy`);
    setStatus(response.summary);
  };

  return (
    <div>
      <h1>Transfer Files with Transferables</h1>
      <p>
        This example uses <code>withTransferable</code> to move the file&apos;s underlying ArrayBuffer between the
        host and worker without cloning the data.
      </p>
      <label style={{ display: "inline-block", marginBottom: 12 }}>
        Choose a file:
        <input type="file" onChange={onFileChange} disabled={!connection} style={{ marginLeft: 8 }} />
      </label>
      <p style={{ whiteSpace: "pre-wrap" }}>{status}</p>
      {downloadUrl && (
        <a href={downloadUrl} download={downloadName || "worker-output.bin"}>
          Download processed copy
        </a>
      )}
    </div>
  );
}

export default FileTransferExample;
