import type { Refine } from './index';

type Assert<T extends true> = T;
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// --- Unmentioned fields pass through unchanged ---
type Base1 = { a: string; b: number; c: boolean };
type R1 = Refine<Base1, { a: 'hello' }>;
type _r1a = Assert<Eq<R1['b'], number>>;
type _r1b = Assert<Eq<R1['c'], boolean>>;

// --- Literal narrowing ---
type _r1c = Assert<Eq<R1['a'], 'hello'>>;

// --- Function replacement with literal params ---
type Base2 = { fn: (x: string, y: number) => Promise<boolean> };
type R2 = Refine<Base2, { fn: (x: 'test', y: 123) => Promise<true> }>;
const r2 = {} as R2;
r2.fn('test', 123); // ok — literal params enforced

// --- Setting a field to undefined removes it ---
type Base3 = { keep: string; remove: () => void };
type R3 = Refine<Base3, { remove: undefined }>;
const r3 = {} as R3;
r3.keep.toUpperCase(); // ok
// @ts-expect-error — remove is undefined
r3.remove();

// --- Record key preservation (HookEvent-like) ---
type MyEvent = 'A' | 'B' | 'C';
type Base4 = { events?: Partial<Record<MyEvent, number[]>> };
type R4 = Refine<Base4, { events: Record<string, string[]> }>;
const r4 = {} as R4;
r4.events!.A = ['ok']; // ok
// @ts-expect-error — "X" is not a valid event key
r4.events!.X = ['bad'];

// --- Union narrowing via partial shape match ---
type Animal = { type: 'dog'; bark: boolean } | { type: 'cat'; purr: boolean };
type Base5 = { pet: Record<string, Animal> };
type R5 = Refine<Base5, { pet: Record<string, { type: 'dog' }> }>;
const r5 = {} as R5;
r5.pet.fido.bark; // ok — narrowed to dog
// @ts-expect-error — purr doesn't exist on dog
r5.pet.fido.purr;

// --- Array element refinement (intersects, preserving base fields) ---
type Base6 = { items: Array<{ id: number; name: string }> };
type R6 = Refine<Base6, { items: Array<{ id: 42; name: 'alice' }> }>;
const r6 = {} as R6;
const id: 42 = r6.items[0].id; // ok — narrowed to literal
const name2: 'alice' = r6.items[0].name; // ok — narrowed to literal

// --- Union narrowing in record values ---
type Transport =
  | { type: 'http'; url: string }
  | { type: 'ws'; port: number }
  | { type: 'stdio'; cmd: string };
type Base7 = { servers: Record<string, Transport> };
type R7 = Refine<Base7, { servers: Record<string, { type: 'http' }> }>;
const r7 = {} as R7;
r7.servers.api.url; // ok — narrowed to http
// @ts-expect-error — port is on ws, not http
r7.servers.api.port;
// @ts-expect-error — cmd is on stdio, not http
r7.servers.api.cmd;

// --- Record value replacement (no union match → replace) ---
type EventKey = 'click' | 'hover' | 'scroll';
type Base8 = {
  handlers?: Partial<Record<EventKey, ((...args: any[]) => void)[]>>;
};
type R8 = Refine<Base8, { handlers: Record<string, string[]> }>;
const r8 = {} as R8;
r8.handlers!.click = ['handler1']; // ok — replaced with strings
// @ts-expect-error — functions no longer accepted
r8.handlers!.click = [() => {}];
// @ts-expect-error — invalid event key
r8.handlers!.resize;

// --- Nested object intersection (non-union → intersects, keeps all fields) ---
type Base9 = {
  config: { name: string; debug: boolean; callback: () => void };
};
type R9 = Refine<Base9, { config: { name: 'prod'; debug: false } }>;
const r9 = {} as R9;
const n9: 'prod' = r9.config.name; // ok — literal
const d9: false = r9.config.debug; // ok — literal
r9.config.callback(); // ok — preserved from base

// --- Partial constraint on non-union → intersects, preserves base fields ---
type Base10 = { config: { name: string; debug: boolean; version: number } };
type R10 = Refine<Base10, { config: { name: 'prod' } }>;
const r10 = {} as R10;
const n10: 'prod' = r10.config.name; // ok — narrowed
r10.config.version.toFixed(); // ok — preserved from base

// --- Union narrowing works via Records (R5, R7) but not direct fields ---
// Direct union fields use RefineField which replaces when Extract can't match.
// Use Record<string, Union> pattern for union narrowing.
type Mode =
  | { mode: 'dev'; verbose: boolean }
  | { mode: 'prod'; region: string };
type Base11 = { modes: Record<string, Mode> };
type R11 = Refine<Base11, { modes: Record<string, { mode: 'prod' }> }>;
const r11 = {} as R11;
r11.modes.x.region; // ok — narrowed to prod via Record
// @ts-expect-error — verbose is on dev, not prod
r11.modes.x.verbose;

// --- Empty constraint is identity ---
type Base12 = { a: string; b: number };
type R12 = Refine<Base12, {}>;
type _r12a = Assert<Eq<R12, { a: string; b: number }>>;

// --- Optional field stays optional but narrows the inner type ---
type Base13 = { name?: string; age: number };
type R13 = Refine<Base13, { name: 'alice' }>;
type _r13 = Assert<Eq<R13['name'], 'alice' | undefined>>;

// --- Nullable field narrowed to literal ---
type Base14 = { value: string | null };
type R14 = Refine<Base14, { value: 'yes' }>;
type _r14 = Assert<Eq<R14['value'], 'yes'>>;

// --- Multiple fields refined simultaneously ---
type Base15 = { a: string; b: number; c: boolean };
type R15 = Refine<Base15, { a: 'x'; b: 42 }>;
type _r15a = Assert<Eq<R15['a'], 'x'>>;
type _r15b = Assert<Eq<R15['b'], 42>>;
type _r15c = Assert<Eq<R15['c'], boolean>>;

// --- Function signature narrowing (params + return type) ---
type Base16 = { fn: (name: string, age: number) => boolean };
type R16 = Refine<Base16, { fn: (name: string, age: 123) => true }>;
const r16 = {} as R16;
const result: true = r16.fn('alice', 123);
// @ts-expect-error — return type is narrowed to true
const bad: false = r16.fn('alice', 123);
