import * as index from "@browser/index";
import * as test from "tape"

test("Fibonacci calculations", (t) => {
	t.plan(4);

	t.equal(index.fibonacci(1), 1, "are correct for '1'")
	t.equal(index.fibonacci(2), 2, "are correct for '2'")
	t.equal(index.fibonacci(4), 5, "are correct for '4'")
	t.equal(index.fibonacci(6), 13, "are correct for '6'")
})