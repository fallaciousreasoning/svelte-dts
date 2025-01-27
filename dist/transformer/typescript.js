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
const ts = __importStar(require("typescript"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
class TypescriptTransformer {
    constructor(fileName, dir, moduleName, isDefault) {
        this.fileName = fileName;
        this.dir = dir;
        this.subdir = path_1.default.dirname(this.fileName).replace(this.dir, '');
        this.moduleName = moduleName;
        this.isDefault = isDefault;
    }
    exec() {
        const options = { declaration: true, emitDeclarationOnly: true };
        const host = ts.createCompilerHost(options);
        host.writeFile = (_, contents) => {
            this.declaration = contents;
        };
        const program = ts.createProgram([this.fileName], options, host);
        program.emit();
    }
    toString() {
        const pathParse = path_1.default.parse(this.fileName);
        let string = `declare module '${this.moduleName}${this.subdir}/${pathParse.base}' {\n`;
        if (this.isDefault) {
            string = `declare module '${this.moduleName}' {\n`;
        }
        string += this.declaration
            .replace(/declare /g, '')
            .split('\n')
            .map((item) => (item !== '' ? `\t${item}` : undefined))
            .filter((item) => !!item)
            .join('\n');
        string += `\n}\n\n`;
        return string;
    }
    appendFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            this.exec();
            yield fs_1.promises.appendFile(path, this.toString());
        });
    }
}
exports.default = TypescriptTransformer;
