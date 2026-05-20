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

`Refine<Base, Constraint>` maps over the keys of `Base` and applies `Constraint` per-field:

- **Unmentioned fields** pass through unchanged
- **Literal narrowing** — `Refine<{ a: string }, { a: 'hello' }>` narrows `a` to `'hello'`
- **Nested intersection** — non-union object fields are intersected, preserving base fields not in the constraint
- **Union narrowing** — use `Record<string, Union>` to narrow union members by discriminant
- **Record key preservation** — `Record<string, ...>` constraints refine values while keeping the original keys
- **Array refinement** — array element types are refined individually
- **Function narrowing** — refine parameter types and return types

## License

MIT
