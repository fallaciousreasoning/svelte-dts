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
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const generator_1 = __importDefault(require("./generator"));
const exec = () => __awaiter(void 0, void 0, void 0, function* () {
    const packageJson = require(path_1.default.join(__dirname, '../package.json'));
    const program = new commander_1.Command();
    program
        .name(`svelte-dts`)
        .version(packageJson.version, '-v --version', 'Version number')
        .helpOption('-h --help', 'For more information')
        .requiredOption('-i, --input <input>', 'input of application')
        .requiredOption('-o, --output <output>', 'output of declarations')
        .option('-e, --extensions <extensions...>', 'valid extensions')
        .parse(process.argv);
    const options = program.opts();
    const generator = new generator_1.default(options.input, { output: options.output, extensions: options.extensions });
    yield generator.read();
    yield generator.write();
});
exec();
