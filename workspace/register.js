const workspace = require("./index");

// Replace node's `require` by a version that passes by the workspace module
workspace.register();