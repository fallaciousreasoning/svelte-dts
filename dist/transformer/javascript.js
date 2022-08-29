"use strict";
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
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
class JavascriptTransformer {
    constructor(fileName, dir, moduleName, isDefault) {
        this.fileName = fileName;
        this.dir = dir;
        this.subdir = path_1.default.dirname(this.fileName).replace(this.dir, '');
        this.moduleName = moduleName;
        this.isDefault = isDefault;
    }
    exec() {
        //
    }
    toString() {
        const pathParse = path_1.default.parse(this.fileName);
        let string = `declare module '${this.moduleName}${this.subdir}/${pathParse.base}';\n\n`;
        if (this.isDefault) {
            string = `declare module '${this.moduleName}';\n\n`;
        }
        return string;
    }
    appendFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            this.exec();
            yield fs_1.promises.appendFile(path, this.toString());
        });
    }
}
exports.default = JavascriptTransformer;
