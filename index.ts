declare const __override: unique symbol;
/**
 * Escape hatch: wrap a constraint value to replace the base type outright,
 * bypassing the conformance check and discarding the base structure at that
 * node (sibling fields are dropped). See {@link Loose} to replace while still
 * merging with the base. Works at any nesting level.
 */
export type Override<T> = { readonly [__override]: T };

declare const __loose: unique symbol;
/**
 * Escape hatch: wrap a constraint value to apply it as a refinement *without*
 * the conformance check. Unlike {@link Override}, it still merges with the
 * base — unmentioned sibling fields are preserved, and keys not present in the
 * base are added. Works at any nesting level.
 */
export type Loose<T> = { readonly [__loose]: T };

/** Either escape-hatch wrapper; used to widen constraint bounds. */
type _Escape = Override<unknown> | Loose<unknown>;

type ShallowMatch<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object ? any : T[K];
};

// Strip Loose/Override wrappers from a value that has no base to merge against
// (a key added by `Loose` that the base lacks), recursing through objects and
// arrays/tuples while leaving functions and primitives intact.
type _Strip<V> = [V] extends [Override<infer X>]
  ? _Strip<X>
  : [V] extends [Loose<infer X>]
    ? _Strip<X>
    : [V] extends [Function]
      ? V
      : [V] extends [readonly any[]]
        ? { [I in keyof V]: _Strip<V[I]> }
        : [V] extends [object]
          ? { [K in keyof V]: _Strip<V[K]> }
          : V;

// Keys present in Constraint but absent from Base — added by `Loose` only.
// Homomorphic over Constraint, so optional modifiers are preserved.
type _AddedKeys<Base, Constraint> = {
  [K in keyof Constraint as K extends keyof Base ? never : K]: _Strip<
    Constraint[K]
  >;
};

type _MergeFields<Base, Constraint, Add extends boolean> = {
  [K in keyof Base]: K extends keyof Constraint
    ? RefineDeep<Base[K], Constraint[K], Add>
    : Base[K];
} & (Add extends true ? _AddedKeys<Base, Constraint> : {});

type _RefineFieldSingle<Base, Constraint, Add extends boolean> = [
  Extract<NonNullable<Base>, ShallowMatch<Constraint>>,
] extends [never]
  ? Constraint
  : [Constraint] extends [Function]
    ? Constraint
    : [Constraint] extends [object]
      ? _MergeFields<
          Extract<NonNullable<Base>, ShallowMatch<Constraint>>,
          Constraint,
          Add
        >
      : Extract<NonNullable<Base>, ShallowMatch<Constraint>> & Constraint;

type RefineField<Base, Constraint, Add extends boolean> = [
  Constraint,
] extends [Override<infer X>]
  ? X
  : [Constraint] extends [Loose<infer X>]
    ? RefineField<Base, X, true>
    : Constraint extends any
      ? _RefineFieldSingle<Base, Constraint, Add>
      : never;

type RefineDeep<Base, Constraint, Add extends boolean> = [
  Constraint,
] extends [Override<infer X>]
  ? X
  : [Constraint] extends [Loose<infer X>]
  ? RefineDeep<Base, X, true>
  : [Constraint] extends [Array<infer CE>]
  ? [NonNullable<Base>] extends [Array<infer BE>]
    ? number extends Constraint['length']
      ? RefineField<BE, CE, Add>[]
      : { [I in keyof Constraint]: RefineField<BE, Constraint[I], Add> }
    : RefineField<Base, Constraint, Add>
  : RefineField<Base, Constraint, Add>;

type AllKeys<T> = T extends any ? keyof T & string : never;

type IsAny<T> = 0 extends 1 & T ? true : false;

// Field type for key K across every member of a (possibly union) type.
type FieldType<T, K extends PropertyKey> = T extends any
  ? K extends keyof T
    ? T[K]
    : never
  : never;

// Constraint values allowed for a base field of type B: a narrowing of B
// (recursively for objects/arrays), or an escape-hatch wrapper.
// `any`-typed base fields stay fully permissive.
type ShapeFor<B> = IsAny<B> extends true
  ? any
  : [B] extends [Function]
    ? Function | _Escape
    : [B] extends [readonly (infer E)[]]
      ? Array<ShapeFor<NonNullable<E>>> | _Escape
      : [B] extends [object]
        ? DeepShape<B> | _Escape
        : B | _Escape;

type DeepShape<T> = Partial<{
  [K in AllKeys<T>]: ShapeFor<NonNullable<FieldType<T, K>>>;
}>;

type RefineValue<BaseV, ConstraintV, Add extends boolean> = [
  ConstraintV,
] extends [Override<infer X>]
  ? X
  : [ConstraintV] extends [Loose<infer X>]
  ? RefineValue<BaseV, X, true>
  : [NonNullable<BaseV>] extends [
  Record<string, infer V>,
]
  ? [ConstraintV] extends [Record<string, any>]
    ? {
        [J in keyof NonNullable<BaseV>]: J extends keyof ConstraintV
          ? RefineDeep<V, ConstraintV[J & keyof ConstraintV], Add>
          : NonNullable<BaseV>[J];
      } & (Add extends true ? _AddedKeys<NonNullable<BaseV>, ConstraintV> : {})
    : RefineDeep<BaseV, ConstraintV, Add>
  : RefineDeep<BaseV, ConstraintV, Add>;

type OptInConstraint<Constraint> = {
  [K in keyof Constraint]-?: {} extends Pick<Constraint, K> ? K : never;
}[keyof Constraint];

type _RefineImpl<Base, Constraint, Add extends boolean> = Omit<
  Base,
  keyof Constraint & keyof Base
> & {
  [K in keyof Base & OptInConstraint<Constraint>]?: RefineValue<
    Base[K],
    Exclude<Constraint[K & keyof Constraint], undefined>,
    Add
  >;
} & {
  [K in keyof Base & keyof Constraint as K extends OptInConstraint<Constraint>
    ? never
    : K]: RefineValue<Base[K], Constraint[K], Add>;
} & (Add extends true ? _AddedKeys<Base, Constraint> : {});

type _RefineDistribute<
  Base,
  Constraint,
  CommonKeys,
  Add extends boolean,
> = Constraint extends any
  ? Base extends any
    ? [
        Extract<
          Base,
          Partial<Pick<Constraint, CommonKeys & keyof Constraint>>
        >,
      ] extends [never]
      ? never
      : _RefineImpl<Base, Constraint, Add>
    : never
  : never;

type _RefineCore<Base, Constraint, Add extends boolean> = [Base] extends [
  any[],
]
  ? [Constraint] extends [any[]]
    ? RefineDeep<Base, Constraint, Add>
    : _RefineImpl<Base, Constraint, Add>
  : [_RefineDistribute<Base, Constraint, keyof Base, Add>] extends [never]
    ? _RefineImpl<Base, Constraint, Add>
    : _RefineDistribute<Base, Constraint, keyof Base, Add>;

/**
 * Refine `Base` by overlaying the partial `Constraint` shape onto it.
 *
 * Every constraint value must *conform* to (be a narrowing of) the matching
 * base field. To bypass that check, wrap a value — at any nesting depth — in
 * {@link Loose} (replace it but keep merging with the base, adding any new
 * keys) or {@link Override} (replace the node outright).
 */
export type Refine<
  Base,
  Constraint extends DeepShape<Base> | _Escape,
> = [Constraint] extends [Override<infer X>]
  ? X
  : [Constraint] extends [Loose<infer X>]
    ? _RefineCore<Base, X, true>
    : _RefineCore<Base, Constraint, false>;
