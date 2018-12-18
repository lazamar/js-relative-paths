import * as maths from "@src/lib/maths"; // local module using absolute path
import assert from "assert" // importing an npm module

// Sample function using our local import and node module import
export const fibonacci = n => {
	const fibs = { 0: 1, 1: 1 };

	for (let i = 0; i <= maths.subtract(n, 2); i++) {
		fibs[i + 2] = maths.add(fibs[i], fibs[maths.add(i, 1)])
	}

	const result = fibs[n];
	assert(!isNaN(result), "Ops, something went wrong");

	return result
}


