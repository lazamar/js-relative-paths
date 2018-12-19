const workspace = require("app-root-path").require("/workspace");
const test = require("tape");
const path = require("path");

/* This file tests the `workspace` module.
*/

const realPathRoot = path.resolve(__dirname, "./..");

test("Workspace", t => {
    t.plan(21);

    t.equal(workspace.projectRoot, realPathRoot, "Sets the correct project root");

    const tsconfig = workspace.require("@root/tsconfig.json");
    const tsconfigWorkspaces = Object.keys(tsconfig.compilerOptions.paths);
    const workspaceWorkspaces = Object.keys(workspace.workspaces);
    t.equal(
        workspaceWorkspaces.length,
        tsconfigWorkspaces.length - 1,
        'Recognises all workspaces from tsconfig.json, except "*"'
    );

    const realPathServer = path.join(realPathRoot, "server");
    t.equal(workspace.path("@server"), realPathServer, "Replaces workspace aliases");

    const realFilePath = path.join(realPathServer, "index");
    t.equal(
        workspace.path("@server/index"),
        realFilePath,
        "Returns correct path for files in workspaces"
    );

    const moduleName = "tape";
    const modulePath = require.resolve(moduleName);
    t.equal(workspace.path(moduleName), modulePath, "Returns correct path for node modules");

    const absoluteModulePath = "/home/user/some/path";
    t.equal(
        workspace.path(absoluteModulePath),
        absoluteModulePath,
        "Returns correct path absolute paths"
    );

    const moduleInstance = require(moduleName); // eslint-disable-line global-require
    t.equal(workspace.require(moduleName), moduleInstance, "Requires node modules correctly");

    t.throws(
        () => workspace.path("./tests"),
        /relative/i,
        "Throws if trying to access a path relative to the file position (in the same folder)"
    );

    t.throws(
        () => workspace.path("../relative-paths"),
        "Throws if trying to access a path relative to the file position (in the folder above)"
    );

    t.throws(
        () => workspace.path("@server/../tests"),
        "Throws if trying to access a path outside of specified workspace"
    );

    t.throws(
        () => workspace.path("@root/server/index"),
        "Throws if trying to access a path that should be part of a workspace"
    );

    t.throws(
        () => workspace.path("README.md"),
        "If trying to access a path from root without a forward slash at the beginning, interprets it as a node module."
    );

    t.doesNotThrow(
        () => workspace.path("@root/README.md"),
        "Does not throw if trying accessing a path from root"
    );

    const invalidName = { notvalid: "tests" };
    t.throws(
        () => workspace._parseWorkspaces(realPathRoot, invalidName),
        /invalid/i,
        "Throws if a workspace name is invalid"
    );

    const withDash = { "@with-dash": "tests" };
    t.doesNotThrow(
        () => workspace._parseWorkspaces(realPathRoot, withDash),
        "Accepts workspaces with dashes"
    );

    const overlapping = { "@tests": "tests", "@sub-tests": "tests/browser" };
    t.throws(
        () => workspace._parseWorkspaces(realPathRoot, overlapping),
        /overlap/i,
        "Does not accept overlapping workspaces"
    );

    const repeated = { "@tests": "tests", "@sub-tests": "tests" };
    t.throws(
        () => workspace._parseWorkspaces(realPathRoot, repeated),
        /overlap/i,
        "Does not accept repeated workspaces"
    );

    const nonExistent = { "@non-existent": "i-dont-exist" };
    t.throws(
        () => workspace._parseWorkspaces(realPathRoot, nonExistent),
        /exist/i,
        "Throws if a workspace path doesn't exist"
    );

    const nonExistentBuild = { "@build": "i-dont-exist" };
    t.doesNotThrow(
        () => workspace._parseWorkspaces(realPathRoot, nonExistentBuild),
        'Does not check for the existence of the "@build" workspace folder'
    );

    t.test("toPathWithAlias", st => {
        st.plan(5);
        st.equal(
            moduleName,
            workspace.toPathWithAlias(__dirname, moduleName),
            "Keeps node module names"
        );

        const fileAbsolutePath = path.join(workspace.projectRoot, "index.tsx");
        st.equal(
            "@tests/index",
            workspace.toPathWithAlias(fileAbsolutePath, "./tests/index"),
            "Replaces relative paths with aliases"
        );

        st.equal(
            "@root/.package.json",
            workspace.toPathWithAlias(fileAbsolutePath, "./.package.json"),
            "Sets the root workspace correctly"
        );

        const srcPath = path.join(workspace.projectRoot, "browser/index.ts");
        const requirePath = "./lib/maths";
        const finalPath = "@browser/lib/maths";
        st.equal(
            workspace.toPathWithAlias(srcPath, requirePath),
            finalPath,
            "Replaces relative paths with file name in the source"
        );

        const requirePath2 = "./../tests";
        const finalPath2 = "@tests/index";
        st.equal(
            workspace.toPathWithAlias(srcPath, requirePath2),
            finalPath2,
            'Adds "/index" at the end if the path is equal to the workspace name'
        );
    });

    t.test("register()", st => {
        st.plan(4);

        st.throws(() => {
            workspace.register();
            workspace.unregister();
            require.resolve("@build");
        }, '"unregister()" makes require() go back to normal');

        const withRegistered = f => {
            workspace.register();
            f();
            workspace.unregister();
        };

        withRegistered(() => {
            /* eslint-disable global-require */
            st.equal(
                workspace.require("@root/package.json"),
                require("@root/package.json"),
                "require() returns the same as workspace.require for aliased paths"
            );

            st.equal(
                workspace.require("fs"),
                require("fs"),
                "require() returns the same as workspace.require for native modules"
            );

            st.equal(
                workspace.require("tape"),
                require("tape"),
                "require() returns the same as workspace.require for installed modules"
            );
            /* eslint-disable global-require */
        });
    });
});