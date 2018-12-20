const ws = require("./workspace");
const gulp = require("gulp");
const browserify = require("browserify");
const tsify = require("tsify");
const sass = require("gulp-sass");

// -------------------- TYPESCRIPT -----------------------------

const preprocessPaths = (b, preprocessor) => {
    const resolve = b._bresolve;

    b._bresolve = (id, parent, cb) =>
        parent.inNodeModules === false
            ? resolve(preprocessor(id, parent), parent, cb)
            : resolve(id, parent, cb);
};

const pathPreprocessor = (importPath, importerModule) => {
    try {
        return ws.path(importPath);
    } catch (e) {
        throw new Error(
            `\n\n\tCannot import "${importPath}" from "${importerModule.id}.\n\t${e.message}\n`
        );
    }
};

gulp.task("ts", () => {
    const entry = ws.path("@browser/index.ts");
    const outname = "typescript.js";

    browserify({ entries: [entry], outputName: outname })
        .plugin(preprocessPaths, pathPreprocessor)
        .plugin(tsify)
        .bundle()
        // We are just outputting stuff to stdout to make things simpler
        .pipe(process.stdout);
});

// ----------------------- SASS -----------------------------

// is a node modules if import path starts with a letter
const isNodeModule = p => /^[a-z@]/.test(p);

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
        .pipe(
            sass({
                // Allows us to @import things in `node_modules` directly
                includePaths: ["node_modules"],
                // This importer allows us to use workspace paths
                importer: workspaceImporter
            })
        )
        .pipe(gulp.dest(destPath));
});
