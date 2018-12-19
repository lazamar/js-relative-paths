// Type definitions for Workspace
declare module workspace {
    let projectRoot: string;
    let workspaces: { [s: string]: string; };
    function path (p:string): string;
    function require(p: string): any;
    function toPathWithAlias(sourcePath: string, filePath: string):string
    function register():void
    function unregister():void
}