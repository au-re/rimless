---
"rimless": patch
---

Remove an RPC call's response listener as soon as the call resolves or rejects. Previously the listener stayed registered until the connection closed, so a long-lived connection gained one `message` listener per call and kept every call's arguments in memory.
