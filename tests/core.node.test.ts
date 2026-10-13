import { test } from 'node:test';
import { coreCases } from './core.cases.ts';
for (const [name, run] of coreCases) test(name, run);
