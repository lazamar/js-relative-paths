/*
    For now we are turning most of the linting rules into warnings
    only. The codebase is very big and infringes most of these rules.
    We therefore have two options:
        - Make linting not fail the build
        - Make only a small set of linting rules fail the build

    We are going for the second option. This way we can slowly make
    more and more of these rules actually fail the build.
*/

// Error levels
const error = "error";
const off = "off";
const warning = "warn";

module.exports = {
    "extends": ["eslint:recommended", "prettier"],
    "plugins": ["prettier", "typescript"],
    "parser": "typescript-eslint-parser",
    "env": {
        "es6": true,
        "browser": true,
        "node": true
    },
    "globals": {},
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true
        }
    },
    "rules": {
        "prettier/prettier": [
            error,
            {
                "tabWidth": 4,
                "printWidth": 100
            }
        ],
        "max-len": [
            warning,
            {
                "code": 100,
                "tabWidth": 4,
                "ignoreTrailingComments": true,
                "ignoreUrls": true,
                "ignoreTemplateLiterals": true,
                "ignoreRegExpLiterals": true
            }
        ],
        "no-multiple-empty-lines": error,
        "arrow-body-style": [warning, "as-needed"],
        "no-use-before-define": [
            warning,
            {
                "functions": false,
                "classes": false,
                "variables": false
            }
        ],
        "no-console": warning,
        // "no-var": warning,
        "no-undef": warning,
        "no-eval": error,
        "complexity": [warning, 4],
        "no-unused-vars": [warning, { "argsIgnorePattern": "^_" }],
        "no-return-assign": off,
        "global-require": error,
        "prefer-template": error,
        "no-case-declarations": warning,
        "no-fallthrough": warning,
        "no-param-reassign": warning,
        "no-useless-escape": warning
    }
}