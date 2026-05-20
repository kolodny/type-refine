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

type Refine<
  Base,
  Constraint extends Partial<Record<keyof Base & string, any>>,
> = {
  [K in keyof Base]: K extends keyof Constraint
    ? [NonNullable<Base[K]>] extends [Record<string, infer V>]
      ? [Constraint[K]] extends [Record<string, infer C>]
        ? string extends keyof Constraint[K]
          ? { [J in keyof NonNullable<Base[K]>]: RefineDeep<V, C> }
          : RefineDeep<Base[K], Constraint[K]>
        : RefineDeep<Base[K], Constraint[K]>
      : RefineDeep<Base[K], Constraint[K]>
    : Base[K];
};

export type { Refine as default };
