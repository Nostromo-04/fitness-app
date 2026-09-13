-- Run only when rolling the feature back. This removes every saved instruction.
ALTER TABLE exercises
DROP COLUMN IF EXISTS instruction;
