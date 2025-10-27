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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIpn = exports.handleCancel = exports.handleFail = exports.handleSuccess = exports.initiatePayment = void 0;
const paymentService = __importStar(require("./payment.service"));
const initiatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payment = req.body;
    const result = yield paymentService.initiatePayment(payment);
    if (result && result.paymentGatewayUrl) {
        res.redirect(result.paymentGatewayUrl); // Redirect to SSLCommerz payment gateway
    }
    else {
        res.status(500).json({ message: 'Payment initiation failed.' });
    }
});
exports.initiatePayment = initiatePayment;
const handleSuccess = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tran_id, val_id } = req.query;
    if (typeof tran_id === 'string' && typeof val_id === 'string') {
        const payment = yield paymentService.handlePaymentSuccess(tran_id, val_id);
        if (payment) {
            res.status(200).send(`Payment for transaction ${tran_id} successful. Validation ID: ${val_id}`);
        }
        else {
            res.status(400).send(`Payment success for transaction ${tran_id} could not be processed.`);
        }
    }
    else {
        res.status(400).send('Invalid success callback parameters.');
    }
});
exports.handleSuccess = handleSuccess;
const handleFail = (req, res) => {
    const { tran_id } = req.query;
    if (typeof tran_id === 'string') {
        const payment = paymentService.handlePaymentFail(tran_id);
        if (payment) {
            res.status(400).send(`Payment for transaction ${tran_id} failed.`);
        }
        else {
            res.status(400).send(`Payment failure for transaction ${tran_id} could not be processed.`);
        }
    }
    else {
        res.status(400).send('Invalid fail callback parameters.');
    }
};
exports.handleFail = handleFail;
const handleCancel = (req, res) => {
    const { tran_id } = req.query;
    if (typeof tran_id === 'string') {
        const payment = paymentService.handlePaymentCancel(tran_id);
        if (payment) {
            res.status(200).send(`Payment for transaction ${tran_id} cancelled.`);
        }
        else {
            res.status(400).send(`Payment cancellation for transaction ${tran_id} could not be processed.`);
        }
    }
    else {
        res.status(400).send('Invalid cancel callback parameters.');
    }
};
exports.handleCancel = handleCancel;
const handleIpn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ipn_data = req.body;
    const payment = yield paymentService.handlePaymentIpn(ipn_data);
    if (payment) {
        res.status(200).send('IPN received and processed.');
    }
    else {
        res.status(400).send('IPN could not be processed.');
    }
});
exports.handleIpn = handleIpn;
