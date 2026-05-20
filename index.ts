type ShallowMatch<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object ? any : T[K];
};

type _MergeFields<Base, Constraint> = {
  [K in keyof Base]: K extends keyof Constraint
    ? RefineDeep<Base[K], Constraint[K]>
    : Base[K];
};

type _RefineFieldSingle<Base, Constraint> = [
  Extract<NonNullable<Base>, ShallowMatch<Constraint>>,
] extends [never]
  ? Constraint
  : [Constraint] extends [Function]
    ? Constraint
    : [Constraint] extends [object]
      ? _MergeFields<
          Extract<NonNullable<Base>, ShallowMatch<Constraint>>,
          Constraint
        >
      : Extract<NonNullable<Base>, ShallowMatch<Constraint>> & Constraint;

type RefineField<Base, Constraint> = Constraint extends any
  ? _RefineFieldSingle<Base, Constraint>
  : never;

type RefineDeep<Base, Constraint> = [Constraint] extends [Array<infer CE>]
  ? [NonNullable<Base>] extends [Array<infer BE>]
    ? number extends Constraint['length']
      ? RefineField<BE, CE>[]
      : { [I in keyof Constraint]: RefineField<BE, Constraint[I]> }
    : RefineField<Base, Constraint>
  : RefineField<Base, Constraint>;

type AllKeys<T> = T extends any ? keyof T & string : never;

type DeepShape<T> = Partial<{
  [K in AllKeys<T>]: [NonNullable<T[K & keyof T]>] extends [Function]
    ? any
    : [NonNullable<T[K & keyof T]>] extends [Array<infer E>]
      ? [E] extends [Function]
        ? any
        : [E] extends [object]
          ? Array<DeepShape<E>>
          : any
      : [NonNullable<T[K & keyof T]>] extends [object]
        ? DeepShape<NonNullable<T[K & keyof T]>>
        : any;
}>;

type RefineValue<BaseV, ConstraintV> = [NonNullable<BaseV>] extends [
  Record<string, infer V>,
]
  ? [ConstraintV] extends [Record<string, any>]
    ? {
        [J in keyof NonNullable<BaseV>]: J extends keyof ConstraintV
          ? RefineDeep<V, ConstraintV[J & keyof ConstraintV]>
          : NonNullable<BaseV>[J];
      }
    : RefineDeep<BaseV, ConstraintV>
  : RefineDeep<BaseV, ConstraintV>;

type OptInConstraint<Constraint> = {
  [K in keyof Constraint]-?: {} extends Pick<Constraint, K> ? K : never;
}[keyof Constraint];

type _RefineImpl<Base, Constraint> = Omit<
  Base,
  keyof Constraint & keyof Base
> & {
  [K in keyof Base & OptInConstraint<Constraint>]?: RefineValue<
    Base[K],
    Exclude<Constraint[K & keyof Constraint], undefined>
  >;
} & {
  [K in keyof Base & keyof Constraint as K extends OptInConstraint<Constraint>
    ? never
    : K]: RefineValue<Base[K], Constraint[K]>;
};

type _RefineDistribute<Base, Constraint, CommonKeys> = Constraint extends any
  ? Base extends any
    ? [
        Extract<
          Base,
          Partial<Pick<Constraint, CommonKeys & keyof Constraint>>
        >,
      ] extends [never]
      ? never
      : _RefineImpl<Base, Constraint>
    : never
  : never;

export type Refine<Base, Constraint extends DeepShape<Base>> = [
  Base,
] extends [any[]]
  ? [Constraint] extends [any[]]
    ? RefineDeep<Base, Constraint>
    : _RefineImpl<Base, Constraint>
  : [_RefineDistribute<Base, Constraint, keyof Base>] extends [never]
    ? _RefineImpl<Base, Constraint>
    : _RefineDistribute<Base, Constraint, keyof Base>;
