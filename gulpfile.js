const ws = require("./workspace");
const gulp = require("gulp");
const browserify = require("browserify");
const tsify = require("tsify");
const sass = require("gulp-sass");

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

	return browserify({ entries: [entry], outputName: outname })
	   .plugin(shimify, shimF)
	   .plugin(tsify)
       .bundle()
       // We are just outputting stuff to stdout to make things simpler
       .pipe(process.stdout);
});


// is a node modules if import path starts with a letter
const isNodeModule = p => /^[a-zA-Z]/.test(p);

const workspaceImporter = (importPath, importer) => {
    if (isNodeModule(importPath)) {
        // we do not deal with it
        return null;
    }

    try {
        const absolutePath = ws.path(importPath);
        return { file: absolutePath };
    } catch (e) {
        return new Error(
            `\n\n\tCannot import "${importPath}" from "${importer}.\n\t${e.message}\n`
        );
    }
};

gulp.task("sass", () => {
	const entry = ws.path("@styles/index.scss");
	const destPath = ws.path("@build");

  return gulp
      .src(entry)
      .pipe(sass({
              // Allows us to @import things in `node_modules` directly
              includePaths: ["node_modules"],
              // This importer allows us to use workspace paths
              importer: workspaceImporter
          })
      )
      .pipe(gulp.dest(destPath));
});