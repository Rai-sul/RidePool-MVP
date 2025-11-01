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
exports.handlePaymentCallback = exports.initiatePayment = exports.PaymentStatus = void 0;
/// <reference types="uuid" />
const sslcommerz_lts_1 = __importDefault(require("sslcommerz-lts"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus[PaymentStatus["PENDING"] = 0] = "PENDING";
    PaymentStatus[PaymentStatus["COMPLETED"] = 1] = "COMPLETED";
    PaymentStatus[PaymentStatus["FAILED"] = 2] = "FAILED";
    PaymentStatus[PaymentStatus["REFUNDED"] = 3] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
const store_id = process.env.STORE_ID || 'YOUR_SSLCOMMERZ_STORE_ID';
const store_passwd = process.env.STORE_PASS || 'YOUR_SSLCOMMERZ_STORE_PASSWORD';
const is_live = false; // Set to true for live transactions
const sslcz = new sslcommerz_lts_1.default(store_id, store_passwd, is_live);
const payments = []; // In-memory storage for payment records
const initiatePayment = (userId, tripId, amount, currency) => __awaiter(void 0, void 0, void 0, function* () {
    const tran_id = `TRN_${(0, uuid_1.v4)()}`;
    const data = {
        total_amount: amount,
        currency: currency,
        tran_id: tran_id,
        success_url: `http://localhost:3006/payments/success?tran_id=${tran_id}`,
        fail_url: `http://localhost:3006/payments/fail?tran_id=${tran_id}`,
        cancel_url: `http://localhost:3006/payments/cancel?tran_id=${tran_id}`,
        ipn_url: `http://localhost:3006/payments/ipn`,
        shipping_method: 'No',
        product_name: 'RideShare Trip',
        product_category: 'Transport',
        product_profile: 'general',
        cus_name: userId, // Using userId as customer name for now
        cus_email: 'customer@example.com', // Placeholder
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01XXXXXXXXX', // Placeholder
        cus_fax: '01XXXXXXXXX', // Placeholder
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };
    try {
        const apiResponse = yield sslcz.init(data);
        if (apiResponse.GatewayPageURL) {
            const newPayment = {
                id: (0, uuid_1.v4)(),
                userId,
                tripId,
                amount,
                currency,
                status: PaymentStatus.PENDING,
                transactionId: tran_id,
                gatewayResponse: JSON.stringify(apiResponse),
                paymentUrl: apiResponse.GatewayPageURL,
            };
            payments.push(newPayment);
            return { paymentUrl: apiResponse.GatewayPageURL, transactionId: tran_id };
        }
        else {
            console.error('SSLCommerz initiation failed: No GatewayPageURL', apiResponse);
            return undefined;
        }
    }
    catch (error) {
        console.error('SSLCommerz initiation error:', error);
        return undefined;
    }
});
exports.initiatePayment = initiatePayment;
const handlePaymentCallback = (transactionId, status, gatewayResponse) => __awaiter(void 0, void 0, void 0, function* () {
    const payment = payments.find(p => p.transactionId === transactionId);
    if (payment) {
        // In a real application, you would validate the transaction with SSLCommerz here
        // and update the payment status in your database.
        if (status === 'VALID') {
            payment.status = PaymentStatus.COMPLETED;
        }
        else if (status === 'FAILED') {
            payment.status = PaymentStatus.FAILED;
        }
        payment.gatewayResponse = gatewayResponse;
        return payment;
    }
    return undefined;
});
exports.handlePaymentCallback = handlePaymentCallback;
