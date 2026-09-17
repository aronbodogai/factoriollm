import net from "node:net";

const AUTH = 3;
const EXEC = 2;
const RESPONSE_VALUE = 0;
const AUTH_RESPONSE = 2;

// Factorio sends no end-of-reply sentinel, so a reply is "done" once no more
// packets arrive for a while, not when some terminator shows up.
const SETTLE_MS = 400;

const REPEAT_PROMPT = /please repeat the command/i;

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
 * Started as a port of factorio-broadcast's scripts/rcon.js, which
 * unconditionally sends every command twice on a fresh connection ("the
 * first Lua console command gets back 'Please repeat the command to
 * proceed'"). Verified live against a real 2.0 server that this is wrong in
 * a way that matters: a single send already executes correctly — but
 * blindly sending twice doesn't just double a *request*, it double-EXECUTES
 * the Lua server-side (confirmed: one `create_entity` call sent this way
 * created two entities), and "take the last non-blank reply" then silently
 * reports the *second* execution's result, masking the bug for anything
 * whose output doesn't change between runs (e.g. `ping`, which is why
 * Phase 0 didn't catch this). So: send once; only resend if the reply is
 * actually the "please repeat" prompt, and only once.
 */
export function rconCommand(command: string, opts: RconOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    sock.setTimeout(opts.timeoutMs ?? 30000);

    let acc = Buffer.alloc(0);
    let authed = false;
    let attempt = 0;
    let nextId = 2;
    let replies: string[] = [];
    let quiet: NodeJS.Timeout | undefined;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (quiet) clearTimeout(quiet);
      sock.destroy();
      fn();
    };

    const sendCommand = () => {
      attempt++;
      replies = [];
      sock.write(packet(nextId++, EXEC, command));
      settle();
    };

    const settle = () => {
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(() => {
        const body = [...replies].reverse().find((r) => r.trim().length > 0) ?? "";
        if (attempt === 1 && REPEAT_PROMPT.test(body)) {
          sendCommand();
          return;
        }
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
            sendCommand();
          }
        } else if (type === RESPONSE_VALUE) {
          if (body) replies.push(body);
          settle();
        }
      }
    });
  });
}
