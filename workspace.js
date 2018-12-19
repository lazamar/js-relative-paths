/* eslint-disable global-require, complexity*/

/*
    This module exists so that we never again do this: 
        require("../../../../../file")

    With this module we can do
        thisModule.require("@workspace", "my/path/to/file")

    All paths are specified in `tsconfig.json`

    Why do we need this module?

        -   We want absolute imports in both Node.js and TypeScript.
        
        -   We want things to be as explicit as possible, no environment variables,
        global node variables or any of those shennanigans. If someone looks at the
        code they should be able to figure out by themselves what is going on.

        -   We want path configuration in only ONE place. When changing or adding
        a path we should only go to one place.

        -   We want our IDEs to work! If a path doesn't exist, we should see the IDE error.

        -   Lastly, we want to impose our own rules.
            -   The paths should never overlap
            -   Parent imports are forbidden (e.g. "@somewhere/../../another")
                -   This module enforces this restriction in Node.js
                -   We use an eslint plugin to make sure this is enforced in the 
                    typescript codebase.
*/

const path = require("path");
const fs = require("fs");
const assert = require("assert");

// Regex to validate workspace name
const regexWorkspace = /^@[\w-]+/;

const CONFIG_FILE = "tsconfig";
const DEFAULT_CONFIG = { workspaces: {} };
const LOCAL_MODULE = "tape";

const wsRoot = "@root";
// Do not check for the pre-existence of these workspace directories
const existCheckIgnore = ["@build"];
// Do not use workspaces with these names
const workspacesIgnore = ["*"];
const overlapCheckIgnore = [wsRoot];
const nonOverlapping = workspaces =>
    Object.keys(workspaces).filter(ws => !overlapCheckIgnore.includes(ws));

const pathExists = p => fs.existsSync(p);

const dropUntil = (value, list) =>
    list.length === 0 ? [] : list[0] === value ? list.slice(1) : dropUntil(value, list.slice(1));

// Make all paths absolute;
const parseWorkspaces = (projectRoot, rawWorkspaces) => {
    const workspaces = Object.keys(rawWorkspaces).reduce((acc, ws) => {
        acc[ws] = path.resolve(projectRoot, rawWorkspaces[ws]);
        return acc;
    }, {});

    // Make sure all workspaces conform to our format
    Object.keys(workspaces).forEach(ws => {
        const matches = ws.match(regexWorkspace);
        const wsMatched = matches && matches[0];
        assert(
            wsMatched === ws,
            `Invalid workspace name "${ws}". Workspace names must satisfy the following regex: ${regexWorkspace.toString()}`
        );
    });

    // Error if any of the paths doesn't exist
    Object.keys(workspaces)
        .filter(ws => !existCheckIgnore.includes(ws))
        .forEach(ws => {
            const aPath = workspaces[ws];
            assert(pathExists(aPath), `Invalid path for ${ws}. This path does not exist: ${aPath}`);
        });

    // Error if workspaces overlap with each other
    nonOverlapping(workspaces).forEach(ws1 => {
        const path1 = workspaces[ws1];
        nonOverlapping(workspaces).forEach(ws2 => {
            const path2 = workspaces[ws2];
            assert(
                !(path1.includes(path2) && ws1 !== ws2),
                `Paths cannot overlap, these two paths from ${CONFIG_FILE} overlap: "${ws1}" and "${ws2}"`
            );
        });
    });

    return workspaces;
};

const pathFromWorkspace = (workspaces, space, filePath) => {
    assert(
        workspaces[space],
        `Unknown path name: "${space}". This path is not in your ${CONFIG_FILE}`
    );

    const fullPath = path.join(workspaces[space], filePath);
    assert(
        fullPath.includes(workspaces[space]),
        `The path "${fullPath}" escapes the scope of path "${space}"`
    );

    if (space === wsRoot) {
        nonOverlapping(workspaces).forEach(space =>
            assert(
                !fullPath.includes(workspaces[space]),
                `Path from root for ${fullPath} overlaps with path "${space}". Require this file from that path instead.`
            )
        );
    }

    return fullPath;
};

// Receives a file like  "@env/enironment.js"
const pathWorkspaceInfo = filePathWithAlias => {
    // Regex to capture workspace name
    const matches = filePathWithAlias.match(regexWorkspace);
    const wsName = matches && matches[0];
    if (wsName) {
        const wsPath = filePathWithAlias.replace(wsName, "");
        return { name: wsName, path: wsPath };
    }

    return undefined;
};

const isRelativePath = p => p[0] === ".";
const isAbsolutePath = p => p[0] === "/";
const isWorkspacePath = p => p[0] === "@";
const isNodeModule = p => /^[a-zA-Z]/.test(p);

// From path with alias to absolute path
const fromPathWithAlias = (resolve, projectRoot, workspaces, filePath) => {
    if (isRelativePath(filePath)) {
        throw new Error(
            "Relative paths are not allowed. Please use workspace paths or paths from root"
        );
    }

    if (isAbsolutePath(filePath)) {
        return filePath;
    }

    if (isWorkspacePath(filePath)) {
        const ws = pathWorkspaceInfo(filePath);
        return pathFromWorkspace(workspaces, ws.name, ws.path);
    }

    if (isNodeModule(filePath)) {
        return resolve(filePath);
    }

    throw new Error(`Unable to recognise path "${filePath}"`);
};

// ------------------------------------------------------------------------------

const absolutePath = (projectRoot, workspaces, pathOfSourceFile, filePath) => {
    if (isRelativePath(filePath)) {
        return path.join(path.dirname(pathOfSourceFile), filePath);
    }

    if (isWorkspacePath(filePath)) {
        const ws = pathWorkspaceInfo(filePath);
        return pathFromWorkspace(workspaces, ws.name, ws.path);
    }

    throw new Error(`Unable to recognise path "${filePath}"`);
};

const toPathWithAlias = (projectRoot, workspaces, pathOfSourceFile, filePath) => {
    if (isNodeModule(filePath)) {
        return filePath;
    }

    const absolute = absolutePath(projectRoot, workspaces, pathOfSourceFile, filePath);
    assert(
        absolute.includes(projectRoot),
        `Path "${filePath}" is not allowed as it resolves to "${absolute}", which escapes the project root.`
    );

    // Just `find` should work as workspaces don't overlap
    const workspace =
        nonOverlapping(workspaces).find(ws => absolute.startsWith(workspaces[ws])) || wsRoot;

    const pathWithAlias = absolute.replace(workspaces[workspace], workspace);
    // If the path links directly to the route we need to add "index" at
    // the end otherwise typescript doesn't recognise it
    return pathWithAlias === workspace ? path.join(pathWithAlias, "index") : pathWithAlias;
};

// -----------------------------------------------------------------------------

/* eslint-disable complexity */
module.exports = (function() {
    /* eslint-enable complexity */
    // Path to the root of the project
    // We assume that the node_modules folder is at the
    // root of the project and that this package was installed in
    // the project's local node_modules folder
    // TODO: Change this to __dirname when this goes to npm
    const projectRoot = [require.resolve(LOCAL_MODULE)]
        .map(v => v.split(path.sep))
        .map(v => v.reverse())
        .map(v => dropUntil("node_modules", v))
        .map(v => v.reverse())
        .map(v => v.join(path.sep))[0];

    const config = require(path.join(projectRoot, CONFIG_FILE)) || DEFAULT_CONFIG;

    // ------------------------------------------------------------------------------------------
    // TYPESCRIPT SPECIFIC PROCESSING
    const rawPaths = config && config.compilerOptions && config.compilerOptions.paths;
    assert(
        typeof rawPaths === "object",
        `Missing "compilerOptions.paths" object in ${CONFIG_FILE}`
    );

    // Because we are using tsconfig.json and it expects arrays in the paths,
    // we will take them out of the array.
    const stringPaths = Object.keys(rawPaths)
        .filter(ws => !workspacesIgnore.includes(ws))
        .reduce((acc, key) => {
            const blob = rawPaths[key][0];
            // Transform `some/path/*` into `some/path`
            const properPath = blob.replace("/*", "");
            const properWorkspaceName = key.replace("/*", "");
            acc[properWorkspaceName] = properPath;
            return acc;
        }, {});

    const workspaces = parseWorkspaces(projectRoot, stringPaths);
    const resolve = pathWithAlias =>
        fromPathWithAlias(require.resolve, projectRoot, workspaces, pathWithAlias);

    return {
        projectRoot,
        workspaces,
        path: resolve,
        require: pathWithAlias => require(resolve(pathWithAlias)),
        toPathWithAlias: (pathOfSourceFile, filePath) =>
            toPathWithAlias(projectRoot, workspaces, pathOfSourceFile, filePath),
        _parseWorkspaces: parseWorkspaces // exposed for testing only
    };
})();
