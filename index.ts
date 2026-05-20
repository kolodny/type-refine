type RefineField<Base, Constraint> = [
  Extract<NonNullable<Base>, Partial<Constraint>>,
] extends [never]
  ? Constraint
  : Extract<NonNullable<Base>, Partial<Constraint>> & Constraint;

type RefineDeep<Base, Constraint> = [Constraint] extends [Array<infer CE>]
  ? [NonNullable<Base>] extends [Array<infer BE>]
    ? RefineField<BE, CE>[]
    : RefineField<Base, Constraint>
  : RefineField<Base, Constraint>;

type DeepShape<T> = Partial<{
  [K in keyof T & string]: [NonNullable<T[K]>] extends [Function]
    ? any
    : [NonNullable<T[K]>] extends [Array<infer E>]
      ? [E] extends [Function]
        ? any
        : [E] extends [object]
          ? Array<DeepShape<E>>
          : any
      : [NonNullable<T[K]>] extends [object]
        ? DeepShape<NonNullable<T[K]>>
        : any;
}>;

export type Refine<Base, Constraint extends DeepShape<Base>> = {
  [K in keyof Base]: K extends keyof Constraint
    ? [NonNullable<Base[K]>] extends [Record<string, infer V>]
      ? [Constraint[K]] extends [Record<string, any>]
        ? {
            [J in keyof NonNullable<Base[K]>]: J extends keyof Constraint[K]
              ? RefineDeep<V, Constraint[K][J & keyof Constraint[K]]>
              : NonNullable<Base[K]>[J];
          }
        : RefineDeep<Base[K], Constraint[K]>
      : RefineDeep<Base[K], Constraint[K]>
    : Base[K];
};
