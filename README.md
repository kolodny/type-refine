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
import type { Refine } from 'type-refine';

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
  hooks: { onLoad: Array<{ hooks: string[] }> };
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

## License

MIT
