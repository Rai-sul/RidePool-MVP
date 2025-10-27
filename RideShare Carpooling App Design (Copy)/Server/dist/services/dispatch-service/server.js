"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_js_1 = __importDefault(require("./index.js"));
const app = (0, express_1.default)();
const port = 3004;
app.use(express_1.default.json());
app.use('/', index_js_1.default);
app.listen(port, () => {
    console.log(`Dispatch service is running at http://localhost:${port}`);
});
