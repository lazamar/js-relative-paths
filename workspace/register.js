// Enhance node's require so that it can handle typescript paths.
//
// This file is to be required at the beginning 
// of an node app, or even before that by using the `-r`
// flag in node like this:
//
//     node -r ./workspace/register myModules/index.ts
//
const workspace = require("./index");
workspace.register();
