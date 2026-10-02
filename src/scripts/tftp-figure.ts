// The TFTP bootloader figure (components/TftpFigure.astro) as one GSAP
// timeline, about 30 s, looping. It starts by resetting the finished-state
// markup to the beginning, so the still and the end of the loop agree. The
// figure is drawn wide and tall; each drawing says where its links run.

import { gsap } from 'gsap';

const CAPTIONS = [
  'The running application gets an AT command over UART, sets a request flag in the shared flash sector and resets.',
  'At reset the bootloader finds the request flag set, so it stays put instead of jumping to the application.',
  'lwIP brings Ethernet up and DHCP leases an address; the lab PC reads the mode and the IP back over AT commands.',
  'A write request on UDP port 69 opens a fresh port for the transfer, and the application sectors are erased.',
  'Each 512-byte block is programmed as 128 words, read back and CRC32-compared, then acknowledged. A lost block is resent.',
  'A short final block ends it. The flags are rewritten, the board resets, finds a valid stack pointer and jumps to the new application.',
];

// The image: 623 full blocks and a 312-byte tail. Illustrative.
const BLOCKS = 624;
const LAST = 312;
const BYTES = (BLOCKS - 1) * 512 + LAST;
const APP_BASE = 0x08020000;
const APP_BYTES = 768 * 1024;

const LINE = 17; // log line spacing, as in the markup

type Kind = 'at' | 'reply' | 'dhcp' | 'wrq' | 'data' | 'ack' | 'lost';

const hex = (n: number) => {
  const h = n.toString(16).toUpperCase().padStart(8, '0');
  return `0x${h.slice(0, 4)}_${h.slice(4)}`;
};

export function tftpTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-k="${k}"]`)!;
  const text = (k: string, v: string) => () => {
    el(k).textContent = v;
  };
  const pkts = [...svg.querySelectorAll<SVGGElement>('[data-pkt]')];
  const appW = Number(el('cell-0').getAttribute('width')) * 6;

  // Packets run along `axis` between the panels, on the UART or Ethernet line.
  const geo = svg.dataset;
  const axis = geo.axis === 'y' ? 'y' : 'x';
  const across = axis === 'x' ? 'y' : 'x';
  const [PC, MCU, UART, ETH, TRACK] = [geo.pc, geo.mcu, geo.uart, geo.eth, geo.track].map(Number);
  const ROWS = Number(geo.logRows);
  const timeoutAt = `${el('timeout').getAttribute('cx')} ${el('timeout').getAttribute('cy')}`;

  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3 });

  // ---- helpers ---------------------------------------------------------
  // The caption under the drawing says what this moment is.
  const setStep = (n: number) => () => {
    el('caption').textContent = CAPTIONS[n];
  };
  // A line appears; in a window shorter than the log, the lines scroll up to it.
  const log = (i: number, at: number) => {
    tl.to(el(`log-${i}`), { opacity: 1, duration: 0.25 }, at);
    if (i >= ROWS) tl.to(el('log-roll'), { y: -(i - ROWS + 1) * LINE, duration: 0.25 }, at);
  };
  const state = (boot: boolean) => () => {
    el('state').textContent = boot ? 'BOOT' : 'APP';
    el('badge').classList.toggle('is-boot', boot);
    el('led').classList.toggle('is-boot', boot);
  };
  const flag = (k: 'req' | 'exec', on: boolean) => () => el(`flag-${k}`).classList.toggle('is-on', on);
  const reset = (at: number) => {
    tl.to(el('mcu'), { opacity: 0.35, duration: 0.12, repeat: 3, yoyo: true }, at);
    tl.to(el('led'), { opacity: 0, duration: 0.1 }, at).to(el('led'), { opacity: 1, duration: 0.1 }, at + 0.6);
  };
  const showBlock = (block: number) => {
    const bytes = Math.min(block * 512, BYTES);
    el('block').textContent = `${block} / ${BLOCKS}`;
    el('bytes').textContent = `${bytes.toLocaleString('en-GB')} B`;
    el('addr').textContent = hex(APP_BASE + bytes);
    el('fill').setAttribute('width', ((appW * bytes) / APP_BYTES).toFixed(1));
  };
  const pipeline = (at: number, quick = false) => {
    const step = quick ? 0.06 : 0.2;
    for (let i = 0; i < 4; i++) {
      tl.to(el(`pipe-${i}`), { opacity: 1, duration: step * 0.6 }, at + i * step);
      tl.to(el(`pipe-${i}`), { opacity: 0, duration: step * 1.5 }, at + i * step + step);
    }
  };

  let slot = 0;
  const STYLE: Record<Kind, string> = {
    at: 'is-at', reply: 'is-reply', dhcp: 'is-dhcp', wrq: 'is-wrq', data: 'is-data', ack: 'is-ack', lost: 'is-lost',
  };
  // A packet across a lane: towards the board (dir 1) or back to the PC (-1).
  const send = (at: number, label: string, kind: Kind, lane: number, dir: 1 | -1, dur = 0.8, lose = false) => {
    const g = pkts[slot++ % pkts.length];
    const [from, to] = dir > 0 ? [PC, MCU] : [MCU, PC];
    tl.call(() => {
      g.setAttribute('class', `tf-pkt ${STYLE[kind]}`);
      const t = g.querySelector('text')!;
      t.textContent = label;
      // The capsule fits its label.
      const w = t.getComputedTextLength() + 22;
      const r = g.querySelector('rect')!;
      r.setAttribute('width', w.toFixed(1));
      r.setAttribute('x', (-w / 2).toFixed(1));
    }, [], at);
    // In the wide drawing each direction has its own track: towards the board
    // above the line, back below it. In the tall one both ride the line.
    tl.set(g, { [axis]: from, [across]: lane + (dir > 0 ? -TRACK : TRACK), opacity: 1, scale: 1, transformOrigin: '50% 50%' }, at);
    if (!lose) {
      tl.to(g, { [axis]: to, duration: dur, ease: 'power1.inOut' }, at);
      tl.set(g, { opacity: 0 }, at + dur);
      return;
    }
    const mid = (from + to) / 2;
    tl.to(g, { [axis]: mid, duration: dur / 2, ease: 'power1.in' }, at);
    tl.call(() => g.setAttribute('class', 'tf-pkt is-lost'), [], at + dur / 2);
    tl.to(g, { opacity: 0, scale: 0.5, duration: 0.45 }, at + dur / 2 + 0.05);
    tl.to(el('lost'), { opacity: 1, duration: 0.15 }, at + dur / 2).to(el('lost'), { opacity: 0, duration: 0.4 }, at + dur / 2 + 1.1);
  };

  // ---- 0: back to the start --------------------------------------------
  tl.call(() => {
    setStep(0)();
    state(false)();
    flag('req', false)();
    flag('exec', false)();
    el('ip').textContent = '—';
    el('port').textContent = 'not running';
    el('port-tag').textContent = '';
    el('status').textContent = 'running application';
    el('block').textContent = '—';
    el('bytes').textContent = '—';
    el('addr').textContent = hex(APP_BASE);
    el('fill').setAttribute('width', '0');
    el('old').setAttribute('width', (appW * 0.36).toFixed(1));
  }, [], 0);
  tl.set(svg.querySelectorAll('[data-k^="log-"]:not([data-k="log-roll"])'), { opacity: 0 }, 0);
  tl.set(el('log-roll'), { y: 0 }, 0);
  tl.set([el('lost'), el('timeout'), el('speed')], { opacity: 0 }, 0);
  tl.set(pkts, { opacity: 0 }, 0);

  // ---- 1: request ------------------------------------------------------
  log(0, 0.4);
  send(0.4, 'AT+ENTER_BOOT', 'at', UART, 1);
  tl.call(flag('req', true), [], 1.25);
  tl.call(text('status', 'REQ flag set · resetting'), [], 1.25);
  send(1.5, 'OK', 'reply', UART, -1, 0.6);
  log(1, 2.1);
  reset(2.3);
  log(2, 2.6);

  // ---- 2: reboot into the bootloader -----------------------------------
  tl.call(setStep(1), [], 3.2);
  tl.call(state(true), [], 3.3);
  tl.call(text('status', 'REQ set → stay in bootloader'), [], 3.4);

  // ---- 3: network --------------------------------------------------------
  tl.call(setStep(2), [], 5.0);
  tl.call(text('status', 'lwIP up · DHCP'), [], 5.1);
  send(5.2, 'DISCOVER', 'dhcp', ETH, -1, 0.7);
  send(6.0, 'OFFER', 'dhcp', ETH, 1, 0.7);
  send(6.8, 'REQUEST', 'dhcp', ETH, -1, 0.7);
  send(7.6, 'ACK', 'dhcp', ETH, 1, 0.7);
  tl.call(text('ip', '192.168.0.42'), [], 8.3);
  tl.call(text('port', 'listening on UDP :69'), [], 8.4);
  tl.call(text('status', 'listening on UDP :69'), [], 8.4);
  log(3, 8.6);
  send(8.6, 'AT+APP_OR_BOOT?', 'at', UART, 1, 0.6);
  send(9.3, 'BOOT', 'reply', UART, -1, 0.6);
  log(4, 9.9);
  log(5, 10.1);
  send(10.1, 'AT+IP?', 'at', UART, 1, 0.6);
  send(10.8, '192.168.0.42', 'reply', UART, -1, 0.6);
  log(6, 11.4);

  // ---- 4: write request, erase ----------------------------------------
  tl.call(setStep(3), [], 11.8);
  log(7, 11.9);
  log(8, 12.2);
  tl.call(text('port-tag', '→ :69'), [], 12.4);
  send(12.4, 'WRQ app.bin', 'wrq', ETH, 1, 0.8);
  tl.call(text('port-tag', '→ :49152'), [], 13.3);
  tl.call(text('port', 'transfer on UDP :49152'), [], 13.3);
  tl.call(text('status', 'erasing sectors 5–10'), [], 13.3);
  tl.to(el('old'), { attr: { width: 0 }, duration: 1.2, ease: 'power2.in' }, 13.4);
  for (let i = 0; i < 6; i++) tl.fromTo(el(`cell-${i}`), { opacity: 0.25 }, { opacity: 1, duration: 0.25 }, 13.4 + i * 0.2);
  send(14.7, 'ACK 0', 'ack', ETH, -1, 0.7);
  log(9, 15.4);

  // ---- 5: stream, verify, a lost block, a time-lapse -------------------
  tl.call(setStep(4), [], 15.6);
  tl.call(text('status', 'program · read back · CRC32'), [], 15.6);
  const block = (n: number, at: number, dur = 0.7) => {
    send(at, `DATA ${n}`, 'data', ETH, 1, dur);
    pipeline(at + dur);
    tl.call(() => showBlock(n), [], at + dur + 0.85);
    send(at + dur + 0.9, `ACK ${n}`, 'ack', ETH, -1, dur * 0.85);
    return at + dur + 0.9 + dur * 0.85;
  };
  let t = block(1, 15.7);
  log(10, t);
  t = block(2, t + 0.1, 0.6);
  log(11, t);
  // DATA 3 is lost; the client times out and sends it again.
  send(t + 0.1, 'DATA 3', 'data', ETH, 1, 0.6, true);
  log(12, t + 0.5);
  tl.fromTo(el('timeout'), { opacity: 1, rotation: 0, svgOrigin: timeoutAt }, { rotation: 360, svgOrigin: timeoutAt, duration: 1.1, ease: 'none' }, t + 0.6);
  tl.to(el('timeout'), { opacity: 0, duration: 0.2 }, t + 1.7);
  log(13, t + 1.7);
  t = block(3, t + 1.8, 0.6);
  log(14, t);

  // Time-lapse to the last block: packets stream, the counter and the map run.
  const lapse = t + 0.2;
  tl.to(el('speed'), { opacity: 1, duration: 0.2 }, lapse);
  // TFTP is stop-and-wait (RFC 1350): one block in flight, then its ACK.
  // Sped up, but still one packet on the wire at a time.
  for (let i = 0; i < 7; i++) {
    const at = lapse + i * 0.42;
    send(at, 'DATA', 'data', ETH, 1, 0.18);
    pipeline(at + 0.18, true);
    send(at + 0.21, 'ACK', 'ack', ETH, -1, 0.18);
  }
  const counter = { n: 3 };
  tl.to(counter, { n: BLOCKS - 1, duration: 2.9, ease: 'none', onUpdate: () => showBlock(Math.round(counter.n)) }, lapse);
  log(15, lapse + 0.4);
  tl.to(el('speed'), { opacity: 0, duration: 0.2 }, lapse + 3.1);

  // ---- 6: last block, flags, reset, jump ---------------------------------
  const end = lapse + 3.3;
  tl.call(setStep(5), [], end);
  send(end + 0.1, `DATA ${BLOCKS} · ${LAST} B`, 'data', ETH, 1, 0.7);
  pipeline(end + 0.8);
  tl.call(() => {
    showBlock(BLOCKS);
    el('bytes').textContent = `${BYTES.toLocaleString('en-GB')} B · CRC32 ok`;
  }, [], end + 1.6);
  send(end + 1.7, `ACK ${BLOCKS}`, 'ack', ETH, -1, 0.6);
  log(16, end + 2.3);
  log(17, end + 2.5);
  tl.call(text('port', 'listening on UDP :69'), [], end + 2.4);
  tl.call(text('port-tag', '→ :69'), [], end + 2.4);
  tl.call(text('status', 'flags: read · erase · rewrite'), [], end + 2.6);
  tl.call(flag('req', false), [], end + 3.1);
  tl.call(flag('exec', true), [], end + 3.3);
  log(18, end + 3.8);
  send(end + 3.8, 'AT+RESET?', 'at', UART, 1, 0.6);
  reset(end + 4.5);
  tl.call(text('status', 'reset · SP valid → jump'), [], end + 4.6);
  tl.call(state(false), [], end + 5.4);
  tl.call(text('status', 'running new application'), [], end + 5.6);
  log(19, end + 5.6);
  tl.to({}, { duration: 1.5 }, end + 6.2); // hold on the finished state

  return tl;
}
