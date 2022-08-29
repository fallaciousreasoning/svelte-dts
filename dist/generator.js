"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("svelte/compiler");
const ts = __importStar(require("typescript"));
const recursive_readdir_1 = __importDefault(require("recursive-readdir"));
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const svelte_1 = __importDefault(require("./transformer/svelte"));
const typescript_1 = __importDefault(require("./transformer/typescript"));
const javascript_1 = __importDefault(require("./transformer/javascript"));
class Generator {
    constructor(input, options) {
        this.transformers = [];
        this.packageJson = require(path_1.default.join(process.cwd(), 'package.json'));
        this.input = path_1.default.isAbsolute(input) ? input : path_1.default.join(process.cwd(), input);
        this.dir = path_1.default.dirname(this.input);
        this.output = options.output || this.packageJson.types;
        this.extensions = options.extensions || ['.svelte', '.ts', '.js'];
    }
    read() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield recursive_readdir_1.default(this.dir, ['node_modules']);
            yield Promise.all(files.map((item) => this.readFile(item)));
        });
    }
    readFile(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const pathParser = path_1.default.parse(filename);
            const extension = path_1.default.extname(filename);
            if (pathParser.base.includes('.test') || pathParser.base.includes('.spec')) {
                return;
            }
            if (!this.extensions.includes(pathParser.ext)) {
                return;
            }
            if (extension === '.svelte') {
                const fileContent = yield fs_1.promises.readFile(filename, { encoding: 'utf-8' });
                let scriptTsContent = '';
                const resultPreprocess = yield compiler_1.preprocess(fileContent, [
                    {
                        // Ignore style tags. This means we don't have to worry about
                        // plugins for SASS/LESS ect.
                        style: () => ({ code: '' }),
                        script: ({ content, attributes }) => {
                            if (attributes.lang === 'ts') {
                                scriptTsContent = content;
                                const resultTranspile = ts.transpileModule(content, {
                                    compilerOptions: {
                                        module: ts.ModuleKind.ESNext,
                                        target: ts.ScriptTarget.ESNext,
                                        moduleResolution: ts.ModuleResolutionKind.NodeJs,
                                        strict: true,
                                    },
                                });
                                return { code: resultTranspile.outputText };
                            }
                            return { code: content };
                        },
                    },
                ], { filename });
                if (scriptTsContent) {
                    const compiled = compiler_1.compile(resultPreprocess.code, {
                        filename,
                    });
                    this.transformers.push(new svelte_1.default(scriptTsContent, filename, compiled.ast, this.dir, this.packageJson.name, this.input === filename));
                }
            }
            else if (extension === '.ts') {
                this.transformers.push(new typescript_1.default(filename, this.dir, this.packageJson.name, this.input === filename));
            }
            else if (extension === '.js') {
                this.transformers.push(new javascript_1.default(filename, this.dir, this.packageJson.name, this.input === filename));
            }
        });
    }
    write() {
        return __awaiter(this, void 0, void 0, function* () {
            const typesPath = path_1.default.join(process.cwd(), this.output);
            if (fs_1.default.existsSync(typesPath)) {
                yield fs_1.promises.unlink(typesPath);
            }
            yield fs_1.promises.writeFile(typesPath, 'import { SvelteComponentTyped } from "svelte";\n\n');
            yield Promise.all(this.transformers.map((token) => token.appendFile(typesPath)));
        });
    }
}
exports.default = Generator;
