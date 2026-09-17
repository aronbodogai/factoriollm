import net from "node:net";

const AUTH = 3;
const EXEC = 2;
const RESPONSE_VALUE = 0;
const AUTH_RESPONSE = 2;

// Factorio sends no end-of-reply sentinel, so a reply is "done" once no more
// packets arrive for a while, not when some terminator shows up.
const SETTLE_MS = 400;

export interface RconOptions {
  host: string;
  port: number;
  password: string;
  timeoutMs?: number;
}

function packet(id: number, type: number, body: string): Buffer {
  const b = Buffer.from(body, "utf8");
  const buf = Buffer.alloc(12 + b.length + 2);
  buf.writeInt32LE(b.length + 10, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  b.copy(buf, 12);
  buf.writeInt16LE(0, 12 + b.length);
  return buf;
}

/**
 * Send one Lua console command over Factorio's Source-RCON interface.
 *
 * Ported from factorio-broadcast's scripts/rcon.js, which found two
 * Factorio-specific quirks the generic RCON protocol doesn't have:
 *  - the first Lua console command on a fresh connection gets back
 *    "Please repeat the command to proceed", so every command is sent twice
 *    unconditionally rather than only retrying on that specific reply.
 *  - there's no end-of-reply sentinel, so replies are collected until a
 *    quiet period passes, then the last non-blank one is returned.
 *
 * Note: RCON's own reply direction isn't the constrained one — the plan-size
 * ceiling this project works around (see docs/FORMAT.md) is on the way IN
 * (a long pasted Lua command is silently rejected), not on the way out.
 */
export function rconCommand(command: string, opts: RconOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    sock.setTimeout(opts.timeoutMs ?? 30000);

    let acc = Buffer.alloc(0);
    let authed = false;
    const replies: string[] = [];
    let quiet: NodeJS.Timeout | undefined;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (quiet) clearTimeout(quiet);
      sock.destroy();
      fn();
    };

    const settle = () => {
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(() => {
        const body = [...replies].reverse().find((r) => r.trim().length > 0) ?? "";
        finish(() => resolve(body));
      }, SETTLE_MS);
    };

    sock.on("error", (err) => finish(() => reject(err)));
    sock.on("timeout", () => finish(() => reject(new Error("rcon: connection timed out"))));

    sock.connect(opts.port, opts.host, () => {
      sock.write(packet(1, AUTH, opts.password));
    });

    sock.on("data", (data) => {
      acc = Buffer.concat([acc, data]);

      while (acc.length >= 4) {
        const size = acc.readInt32LE(0);
        if (acc.length < size + 4) break;

        const id = acc.readInt32LE(4);
        const type = acc.readInt32LE(8);
        const body = acc.subarray(12, 4 + size - 2).toString("utf8");
        acc = acc.subarray(4 + size);

        if (!authed) {
          if (id === -1) {
            finish(() => reject(new Error("rcon: authentication failed")));
            return;
          }
          if (type === AUTH_RESPONSE) {
            authed = true;
            sock.write(packet(2, EXEC, command));
            sock.write(packet(4, EXEC, command));
            settle();
          }
        } else if (type === RESPONSE_VALUE) {
          if (body) replies.push(body);
          settle();
        }
      }
    });
  });
}
