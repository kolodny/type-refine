# type-refine

[![npm version](https://img.shields.io/npm/v/type-refine.svg)](https://www.npmjs.com/package/type-refine)
[![npm downloads](https://img.shields.io/npm/dm/type-refine.svg)](https://www.npmjs.com/package/type-refine)

A utility type for refining and narrowing TypeScript types.

## Install

```sh
npm install type-refine
```

## Usage

```ts
import type { Refine, Override } from 'type-refine';

type Animal = { type: 'dog'; bark: boolean } | { type: 'cat'; purr: boolean };
type Base = { pet: Record<string, Animal> };

// Narrow record values to just dogs
type OnlyDogs = Refine<Base, { pet: Record<string, { type: 'dog' }> }>;

declare const val: OnlyDogs;
val.pet.fido.bark; // ok
val.pet.fido.purr; // error — purr doesn't exist on dog
```

### Typed message layout

Slack's `KnownBlock` is a large union of block types. Use a tuple constraint to define exactly which blocks appear, in what order:

```ts
import type { KnownBlock } from '@slack/web-api';

type OrderNotification = Refine<
  KnownBlock[],
  [
    { type: 'section'; text: { type: 'mrkdwn' } },
    { type: 'divider' },
    { type: 'actions'; elements: Array<{ type: 'button' }> },
  ]
>;

const message: OrderNotification = [
  { type: 'section', text: { type: 'mrkdwn', text: 'New order from *Alice*' } },
  { type: 'divider' },
  { type: 'actions', elements: [
    { type: 'button', text: { type: 'plain_text', text: 'Approve' }, action_id: 'approve' },
    { type: 'button', text: { type: 'plain_text', text: 'Reject' }, action_id: 'reject' },
  ]},
];
```

Each position is narrowed to its specific block type, with full autocomplete for that block's fields. Swapping the order or adding extra blocks is a type error.

### Configuring a plugin system

Lock down which hooks and transports a config accepts:

```ts
type HookFn = (...args: any[]) => any;
type HookEntry = { hooks: HookFn[]; timeout?: number };
type Transport =
  | { type: 'http'; url: string }
  | { type: 'ws'; port: number }
  | { type: 'stdio'; cmd: string };

type PluginConfig = {
  name: string;
  transport: Transport;
  hooks?: { onLoad?: HookEntry[]; onError?: HookEntry[] };
};

type MyPlugin = Refine<PluginConfig, {
  transport: { type: 'http' };
  // `hooks` is a function array in the base — replacing it with strings is not a
  // narrowing, so it needs `Loose` or `Override` (see "Conformance" below).
  hooks: { onLoad: Array<{ hooks: Override<string[]> }> };
}>;

const plugin: MyPlugin = {
  name: 'metrics',
  transport: { type: 'http', url: 'https://example.com' },
  hooks: {
    onLoad: [{ hooks: ['./setup.sh'] }],
  },
};

plugin.transport.url;    // ok — narrowed to http, has url
plugin.hooks.onLoad[0].hooks[0].toUpperCase(); // ok — hooks replaced with string[]
```

## How it works

`Refine<Base, Constraint>` maps over the keys of `Base` and applies `Constraint` per-field:

- **Unmentioned fields** pass through unchanged
- **Literal narrowing** — `Refine<{ a: string }, { a: 'hello' }>` narrows `a` to `'hello'`
- **Nested refinement** — object fields are refined per-key, preserving base fields not in the constraint
- **Union narrowing** — discriminated unions are narrowed by matching members
- **Record key preservation** — `Record<string, ...>` constraints refine values while keeping the original keys
- **Array refinement** — `Array<T>` constraints refine all elements; tuple constraints enforce position and length
- **Function narrowing** — refine parameter types and return types
- **Optionality control** — `?` on a constraint key makes it optional; no `?` makes it required
- **Conformance by default** — every constraint value must be a *narrowing* of the matching base field; supplying an unrelated type is a compile error
- **`Loose<T>` / `Override<T>` escape hatches** — wrap any value, at any nesting depth, to skip the conformance check: `Loose<T>` merges with the base (siblings preserved, new keys added), `Override<T>` replaces the node outright

## Conformance, `Loose` & `Override`

By default a constraint may only *narrow* the base — each value you supply must be assignable to the corresponding base field. This catches typos and accidental replacements:

```ts
type Config = { retries: number; hooks: Array<() => void> };

// ❌ error — `string` is not a narrowing of `number`
type Bad = Refine<Config, { retries: string }>;

// ✅ ok — `3` is a narrowing of `number`
type Good = Refine<Config, { retries: 3 }>;
```

To bypass the conformance check, wrap a value — at any nesting depth — in one of two escape hatches:

| wrapper | conformance | object result | siblings | can add new keys |
| --- | --- | --- | --- | --- |
| *(default)* | enforced — narrow only | merge | kept | no |
| `Loose<T>` | skipped | merge (`T` applied as a refinement) | **kept** | **yes** |
| `Override<T>` | skipped | replace with exactly `T` | dropped | yes |

```ts
// Loose — replace `hooks` but keep merging; `retries` is preserved:
type L = Refine<Config, Loose<{ hooks: string[] }>>;
//   → { retries: number; hooks: string[] }

// Loose narrows shared keys, preserves siblings, AND adds new ones:
type C = Refine<Config, Loose<{ retries: 3; label: string }>>;
//   → { retries: 3; hooks: Array<() => void>; label: string }

// Override at a leaf — same result, replacing just that field:
type A = Refine<Config, { hooks: Override<string[]> }>;
//   → { retries: number; hooks: string[] }

// Override an entire object — siblings dropped, new keys allowed:
type B = Refine<Config, Override<{ id: string }>>;
//   → { id: string }
```

Reach for **`Loose`** to keep the base and layer changes on top — narrowing or replacing fields that don't conform and adding new ones — without the conformance check. Reach for **`Override`** when you want to discard the base at that node and use a different shape entirely.

## License

MIT
