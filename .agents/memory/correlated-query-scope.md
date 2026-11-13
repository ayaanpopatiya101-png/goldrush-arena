---
name: Correlated query scope
description: Drizzle select projections can remove column qualification inside correlated SQL.
---

In correlated SQL inside a Drizzle single-table select projection, explicitly
qualify the outer-table column in static SQL instead of assuming an interpolated
column retains its table qualifier.

**Why:** Single-table projection rewriting removed a table qualifier inside a
subquery, causing the inner table's same-named column to bind instead. The query
succeeded but returned no matching activity, wrongly hiding eligible players.
Pure ranking tests could not catch this; a database-backed route test did.

**How to apply:** For correlated subqueries whose inner and outer tables share
column names, inspect generated SQL or test the real database query. Use static,
explicit qualification or a properly aliased join; never interpolate user text.
