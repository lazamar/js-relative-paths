const ws = require("./workspace");
const gulp = require("gulp");
const browserify = require("browserify");
const tsify = require("tsify");

const shimify = function(b, shim) {
    b._bresolve = (function(resolve) {
        return function(id, parent, cb) {
            // not undefined and false
            if (parent.inNodeModules === false) {
                return resolve(shim(id, parent), parent, cb);
            }
            return resolve(id, parent, cb);
        };
    })(b._bresolve);
};

const shimF = (importPath, importerModule) => {
    try {
        return ws.path(importPath);
    } catch (e) {
        throw new Error(
            `\n\n\tCannot import "${importPath}" from "${importerModule.id}.\n\t${e.message}\n`
        );
        // DO Nothing
    }
};

gulp.task("ts", () => {
	const entry = ws.path("@browser/index.ts");
	const outname = "typescript.js";

	browserify({ entries: [entry], outputName: outname })
	   .plugin(shimify, shimF)
	   .plugin(tsify)
       .bundle()
       // We are just outputting stuff to stdout to make things simpler
       .pipe(process.stdout);
})
