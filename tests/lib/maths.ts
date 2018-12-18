import * as test from "tape" // Absolute import. The same everywhere
import * as maths from "@src/lib/maths" // Absolute import. The same everywhere

test("Maths", (t) => {
	t.plan(4);

	t.ok(maths.add(2, 2), 4, "adds correctly");
	t.ok(maths.subtract(2, 2), 0, "subtracts correctly");
	t.ok(maths.multiply(2, 3), 6, "multiplies correctly");
	t.ok(maths.divide(2, 2), 1, "divides correctly");
})