"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.login = void 0;
const authService = __importStar(require("./auth.service"));
const login = (req, res) => {
    const { email, password } = req.body;
    // For now, we will use a mock user. We will replace it with a real user from the database later.
    const user = { id: '1', email: 'test@example.com' };
    if (email === user.email) {
        const token = authService.generateToken({ id: user.id, email: user.email });
        res.json({ token });
    }
    else {
        res.status(401).send('Invalid credentials');
    }
};
exports.login = login;
const verifyToken = (req, res) => {
    var _a, _b;
    const token = (_b = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')) === null || _b === void 0 ? void 0 : _b[1];
    if (token) {
        const decoded = authService.verifyToken(token);
        if (decoded) {
            res.json(decoded);
        }
        else {
            res.status(401).send('Invalid token');
        }
    }
    else {
        res.status(401).send('Token not found');
    }
};
exports.verifyToken = verifyToken;
