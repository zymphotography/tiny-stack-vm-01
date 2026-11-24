import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

// Tiny stack VM for make.fun's tiny-stack-vm-01 (ISA v1).
// One run answers a whole set: it reads every /input/<id>/program.bin with
// its /input/<id>/input.bin and writes /output/<id>/stdout.bin plus
// /output/<id>/exit.txt for each of them.

const STEP_MAX = 1000000;
const OUT_MAX = 65536;
const STACK_MAX = 256;
const CALL_MAX = 64;
const MEM_WORDS = 256;

// Opcode byte -> [immediate bytes, values popped, values pushed].
const META = {
  0x00: [0, 0, 0], // HALT
  0x01: [1, 0, 1], // PUSH8
  0x02: [4, 0, 1], // PUSH32
  0x03: [0, 1, 0], // POP
  0x04: [0, 1, 2], // DUP
  0x05: [0, 2, 2], // SWAP
  0x06: [0, 2, 3], // OVER
  0x07: [0, 3, 3], // ROT
  0x10: [0, 2, 1], // ADD
  0x11: [0, 2, 1], // SUB
  0x12: [0, 2, 1], // MUL
  0x13: [0, 2, 1], // DIV
  0x14: [0, 2, 1], // MOD
  0x15: [0, 2, 1], // DIVU
  0x16: [0, 2, 1], // MODU
  0x17: [0, 1, 1], // NEG
  0x18: [0, 2, 1], // AND
  0x19: [0, 2, 1], // OR
  0x1a: [0, 2, 1], // XOR
  0x1b: [0, 1, 1], // NOT
  0x1c: [0, 2, 1], // SHL
  0x1d: [0, 2, 1], // SHR
  0x1e: [0, 2, 1], // SHRU
  0x20: [0, 2, 1], // EQ
  0x21: [0, 2, 1], // LT
  0x22: [0, 2, 1], // LTU
  0x30: [2, 0, 0], // JMP
  0x31: [2, 1, 0], // JZ
  0x32: [2, 1, 0], // JNZ
  0x33: [2, 0, 0], // CALL
  0x34: [0, 0, 0], // RET
  0x40: [0, 1, 1], // LOAD
  0x41: [0, 2, 0], // STORE
  0x50: [0, 1, 0], // PRINT
  0x51: [0, 1, 0], // PUTC
  0x52: [0, 0, 1], // IN
  0x53: [0, 1, 0], // EXIT
};

// Runs one program on its input bytes. Returns the bytes it wrote and the
// exit code it ended with (a trap's code included).
function run(prog, input) {
  const n = prog.length;
  const st = new Int32Array(STACK_MAX);
  let sp = 0;
  const cs = new Int32Array(CALL_MAX);
  let cp = 0;
  const mem = new Int32Array(MEM_WORDS);
  const out = new Uint8Array(OUT_MAX);
  let olen = 0;
  let ipos = 0;
  let pc = 0;
  let steps = 0;
  const end = (exit) => ({ out: out.subarray(0, olen), exit });

  for (;;) {
    if (steps === STEP_MAX) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = prog[pc];
    const m = META[op];
    if (m === undefined) return end(5);
    const imm = m[0];
    if (pc + imm >= n) return end(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < m[1]) return end(2);
    if (sp - m[1] + m[2] > STACK_MAX) return end(3);
    pc = next;

    switch (op) {
      case 0x00: // HALT
        return end(0);
      case 0x01: // PUSH8, sign-extended
        st[sp++] = (prog[next - 1] << 24) >> 24;
        break;
      case 0x02: // PUSH32, little-endian
        st[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24);
        break;
      case 0x03: // POP
        sp--;
        break;
      case 0x04: // DUP
        st[sp] = st[sp - 1];
        sp++;
        break;
      case 0x05: { // SWAP
        const t = st[sp - 1];
        st[sp - 1] = st[sp - 2];
        st[sp - 2] = t;
        break;
      }
      case 0x06: // OVER
        st[sp] = st[sp - 2];
        sp++;
        break;
      case 0x07: { // ROT
        const a = st[sp - 3];
        st[sp - 3] = st[sp - 2];
        st[sp - 2] = st[sp - 1];
        st[sp - 1] = a;
        break;
      }
      case 0x17: // NEG
        st[sp - 1] = (-st[sp - 1]) | 0;
        break;
      case 0x1b: // NOT
        st[sp - 1] = ~st[sp - 1];
        break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = st[sp - 1];
        const a = st[sp - 2];
        let r;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return end(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) {
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2;
        st[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: { // JMP, JZ, JNZ
        const rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        if (op === 0x30) {
          pc = next + rel;
          break;
        }
        const v = st[--sp];
        if ((op === 0x31) === (v === 0)) pc = next + rel;
        break;
      }
      case 0x33: // CALL, absolute address
        if (cp === CALL_MAX) return end(7);
        cs[cp++] = next;
        pc = prog[next - 2] | (prog[next - 1] << 8);
        break;
      case 0x34: // RET
        if (cp === 0) return end(8);
        pc = cs[--cp];
        break;
      case 0x40: { // LOAD
        const addr = st[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        st[sp - 1] = mem[addr];
        break;
      }
      case 0x41: { // STORE
        const addr = st[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        mem[addr] = st[sp - 2];
        sp -= 2;
        break;
      }
      case 0x50: { // PRINT, decimal ASCII, no newline
        const s = String(st[sp - 1]);
        if (olen + s.length > OUT_MAX) return end(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 0x51: // PUTC, one low byte
        if (olen + 1 > OUT_MAX) return end(11);
        out[olen++] = st[--sp] & 255;
        break;
      case 0x52: // IN, -1 once the input is used up
        st[sp++] = ipos < input.length ? input[ipos++] : -1;
        break;
      case 0x53: // EXIT, low byte of the top value
        return end(st[--sp] & 255);
    }
  }
}

// Answer the whole set: one /output/<id>/ per /input/<id>/. Under the local
// grader the two directories arrive as environment variables instead.
const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const ids = readdirSync(IN_DIR).sort();
for (const id of ids) {
  const dir = IN_DIR + '/' + id;
  const r = run(readFileSync(dir + '/program.bin'), readFileSync(dir + '/input.bin'));
  const od = OUT_DIR + '/' + id;
  mkdirSync(od, { recursive: true });
  writeFileSync(od + '/stdout.bin', r.out);
  writeFileSync(od + '/exit.txt', String(r.exit));
}
