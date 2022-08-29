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
const tmp_1 = __importDefault(require("tmp"));
const capitalize = (text) => text[0].toLocaleUpperCase() + text.substring(1);
class SvelteTransformer {
    constructor(content, fileName, ast, dir, moduleName, isDefault) {
        this.containExportModifier = (node) => {
            if (node.modifiers) {
                return node.modifiers.some((node) => node.kind === ts.SyntaxKind.ExportKeyword);
            }
            return false;
        };
        this.sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);
        this.fileName = fileName;
        this.ast = ast;
        this.props = [];
        this.events = [];
        this.slotProps = [];
        this.dir = dir;
        this.subdir = path_1.default.dirname(this.fileName).replace(this.dir, '');
        this.moduleName = moduleName;
        this.isDefault = isDefault;
        this.typesForSearch = [];
        this.declarationNode = [];
        this.declarationImport = [];
    }
    isEventDispatcher(node) {
        return node.declarationList.declarations.some((item) => ts.isVariableDeclaration(item) &&
            item.initializer &&
            ts.isCallExpression(item.initializer) &&
            item.initializer.expression.getText(this.sourceFile) === 'createEventDispatcher');
    }
    addTypeForSearch(newType) {
        const includeType = this.typesForSearch.map((item) => item.getText(this.sourceFile) === newType.getText(this.sourceFile));
        if (!includeType || this.typesForSearch.length === 0) {
            this.typesForSearch.push(newType);
        }
    }
    compileProperty(node) {
        node.declarationList.declarations.forEach((declaration) => {
            const name = declaration.name.getText(this.sourceFile);
            let type = 'any';
            let isOptional = false;
            if (declaration.type) {
                type = declaration.type.getText(this.sourceFile);
                if (ts.isTypeReferenceNode(declaration.type)) {
                    this.addTypeForSearch(declaration.type);
                }
                if (ts.isUnionTypeNode(declaration.type)) {
                    const nameValidTypes = declaration.type.types.reduce((acc, type) => {
                        const typeForCheck = ts.isLiteralTypeNode(type) ? type.literal : type;
                        if (typeForCheck.kind === ts.SyntaxKind.NullKeyword ||
                            typeForCheck.kind === ts.SyntaxKind.UndefinedKeyword) {
                            isOptional = true;
                            return acc;
                        }
                        return [...acc, type.getText(this.sourceFile)];
                    }, []);
                    type = nameValidTypes.join(' | ');
                }
            }
            this.props.push({ name, type, isOptional });
        });
    }
    compileEvent(node) {
        node.declarationList.declarations.forEach((declaration) => {
            if (declaration.initializer &&
                ts.isCallExpression(declaration.initializer) &&
                declaration.initializer.typeArguments) {
                declaration.initializer.typeArguments.forEach((item) => {
                    if (ts.isTypeLiteralNode(item)) {
                        item.members.forEach((member) => {
                            var _a;
                            if (ts.isPropertySignature(member)) {
                                const name = member.name.getText(this.sourceFile);
                                const type = ((_a = member.type) === null || _a === void 0 ? void 0 : _a.getText(this.sourceFile)) || 'any';
                                if (member.type && ts.isTypeReferenceNode(member.type)) {
                                    this.addTypeForSearch(member.type);
                                }
                                this.events.push({ name, type });
                            }
                        });
                    }
                });
            }
        });
    }
    execSlotProperty(node) {
        if (node.type === 'Slot' && node.attributes) {
            node.attributes.forEach((item) => this.slotProps.push({ name: item.name, type: 'any' }));
        }
        if (node.children) {
            node.children.forEach((item) => this.execSlotProperty(item));
        }
    }
    verifyImportDeclaration(node, name) {
        if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            const elements = node.importClause.namedBindings.elements;
            const newElements = elements.filter((element) => element.name.getText(this.sourceFile) === name);
            if (newElements.length > 0) {
                const importString = newElements.map((item) => item.name.getText(this.sourceFile)).join(', ');
                this.declarationImport.push(`import { ${importString} } from ${node.moduleSpecifier.getText(this.sourceFile)};`);
            }
        }
    }
    exec() {
        ts.forEachChild(this.sourceFile, (node) => {
            if (ts.isVariableStatement(node)) {
                if (this.containExportModifier(node)) {
                    this.compileProperty(node);
                }
                else if (this.isEventDispatcher(node)) {
                    this.compileEvent(node);
                }
            }
        });
        this.typesForSearch.forEach((item) => {
            const name = item.typeName.getText(this.sourceFile);
            ts.forEachChild(this.sourceFile, (node) => {
                var _a;
                if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
                    if (((_a = node.name) === null || _a === void 0 ? void 0 : _a.getText(this.sourceFile)) === name) {
                        this.declarationNode.push(node.getText(this.sourceFile));
                    }
                }
                else if (ts.isImportDeclaration(node)) {
                    this.verifyImportDeclaration(node, name);
                }
            });
        });
        this.execSlotProperty(this.ast.html);
    }
    toStringDeclarations() {
        return __awaiter(this, void 0, void 0, function* () {
            const tempFile = tmp_1.default.fileSync({ postfix: '.ts' });
            const content = this.declarationNode.reduce((acc, item) => `${acc}${item}\n\n`, '');
            let declaration = '';
            yield fs_1.promises.writeFile(tempFile.name, content);
            const options = { declaration: true, emitDeclarationOnly: true };
            const host = ts.createCompilerHost(options);
            host.writeFile = (_, contents) => (declaration = contents);
            const program = ts.createProgram([tempFile.name], options, host);
            program.emit();
            tempFile.removeCallback();
            declaration = declaration
                .replace(/declare /g, '')
                .split('\n')
                .map((item) => `\t${item}`)
                .join('\n');
            return `${declaration}\n`;
        });
    }
    toString() {
        return __awaiter(this, void 0, void 0, function* () {
            const pathParse = path_1.default.parse(this.fileName);
            const propsString = this.props.reduce((acc, prop) => `${acc}\n\t\t${prop.name}${prop.isOptional ? '?' : ''}: ${prop.type};`, '');
            const eventsString = this.events.map((event) => `${event.name}: CustomEvent<${event.type}>`).join(', ');
            const slotPropsString = this.slotProps.map((slotProp) => `${slotProp.name}: ${slotProp.type}`).join(', ');
            let string = `declare module '${this.moduleName}${this.subdir}/${pathParse.base}' {\n`;
            if (this.isDefault) {
                string = `declare module '${this.moduleName}' {\n`;
            }
            if (this.declarationImport.length > 0) {
                string += this.declarationImport.reduce((acc, item) => `${acc}\t${item}\n`, '');
                string += '\n';
            }
            if (this.declarationNode.length > 0) {
                string += yield this.toStringDeclarations();
            }
            string += `\tinterface ${capitalize(pathParse.name)}Props {${propsString}\n\t}\n\n`;
            string += `\texport default class ${capitalize(pathParse.name)} extends SvelteComponentTyped<\n`;
            string += `\t\t${capitalize(pathParse.name)}Props,\n\t\t{ ${eventsString} },\n\t\t{ ${slotPropsString} }\n\t> {}`;
            string += `\n}\n\n`;
            return string;
        });
    }
    appendFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            this.exec();
            yield fs_1.promises.appendFile(path, yield this.toString());
        });
    }
}
exports.default = SvelteTransformer;
