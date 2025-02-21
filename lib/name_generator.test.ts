import {
  assert,
  assertMatch,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { adjectives, generateName, medicalRoles } from "./name_generator.ts";

Deno.test("Generated name follows PascalCase format and has no spaces", () => {
  const name = generateName();
  assertMatch(
    name,
    /^[A-Z][a-z]+[A-Z][a-z]+\d{5}$/,
    "Name does not match PascalCase format",
  );
});

Deno.test("Adjective is from predefined list", () => {
  const name = generateName();
  const match = name.match(/^([A-Z][a-z]+)[A-Z]/);
  assert(match, "Adjective extraction failed");
  const adj = match[1];
  assert(
    adjectives.includes(adj),
    `Adjective '${adj}' is not in the predefined list`,
  );
});

Deno.test("Role is from predefined list", () => {
  const name = generateName();
  const match = name.match(/^[A-Z][a-z]+([A-Z][a-z]+)\d{5}$/);
  assert(match, "Role extraction failed");
  const role = match[1];
  assert(
    medicalRoles.includes(role),
    `Role '${role}' is not in the predefined list`,
  );
});

Deno.test("Number is a valid 5-digit number", () => {
  const name = generateName();
  const match = name.match(/\d{5}$/);
  assert(match, "Number extraction failed");
  const number = Number(match[0]);
  assert(
    number >= 10000 && number <= 99999,
    "Generated number is not a valid 5-digit number",
  );
});
