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
exports.login = exports.register = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const users = []; // In-memory user store
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return undefined;
    }
};
exports.verifyToken = verifyToken;
const register = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
    // In a real app, hash password and store in DB
    const newUser = {
        id: (0, uuid_1.v4)(),
        email,
        password, // Store hashed password in real app
    };
    users.push(newUser);
    const token = (0, exports.generateToken)({ id: newUser.id, email: newUser.email });
    return Object.assign(Object.assign({}, newUser), { token });
});
exports.register = register;
const login = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
    // In a real app, compare hashed password from DB
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        const token = (0, exports.generateToken)({ id: user.id, email: user.email });
        return Object.assign(Object.assign({}, user), { token });
    }
    return undefined;
});
exports.login = login;
