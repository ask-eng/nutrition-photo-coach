import { test } from 'vitest';
import { coreCases } from './core.cases.ts';
for (const [name, run] of coreCases) test(name, run);
