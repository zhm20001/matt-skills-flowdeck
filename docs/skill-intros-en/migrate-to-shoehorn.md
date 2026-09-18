---
name: migrate-to-shoehorn
category: misc
order: 2
title: Migrating to shoehorn
summary: Replaces the as assertions in your tests with shoehorn's type-safe forms: fromPartial takes care of missing fields, fromAny of data you made wrong on purpose.
---
# migrate-to-shoehorn

**migrate-to-shoehorn moves `as` type assertions in test files over to @total-typescript/shoehorn** — it lets you hand tests partial data and still pass type checking. Two migrations: `x as Type` → `fromPartial(x)` (when you care about two or three fields of a large object, you should not have to fake the other twenty properties); `x as unknown as Type` → `fromAny(x)` (feed deliberately wrong data to exercise an error path without giving up autocomplete). fromExact, separately, demands the whole shape. **Allowed in test code only, never in production code**.

The flow: first ask which test files suffer from `as`, whether the pattern is "large object, few fields", and whether you need deliberately wrong data; then install, locate by grep (`grep -r " as [A-Z]" --include="*.test.ts"`), replace one at a time, add the imports, and close with a type check.

## When to use

- Someone mentions shoehorn.

- The `as` assertions in your tests are getting in the way and you want type-safe partial test data.



## Original description



> Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests, or needs partial test data.
