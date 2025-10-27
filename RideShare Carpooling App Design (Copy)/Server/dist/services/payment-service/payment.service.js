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
exports.handlePaymentIpn = exports.handlePaymentCancel = exports.handlePaymentFail = exports.handlePaymentSuccess = exports.initiatePayment = void 0;
const sslcommerz_lts_1 = __importDefault(require("sslcommerz-lts"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const store_id = process.env.STORE_ID || 'YOUR_SSLCOMMERZ_STORE_ID';
const store_passwd = process.env.STORE_PASS || 'YOUR_SSLCOMMERZ_STORE_PASSWORD';
const is_live = false; // Set to true for live transactions
const sslcz = new sslcommerz_lts_1.default(store_id, store_passwd, is_live);
const payments = []; // In-memory storage for payment records
const initiatePayment = (payment) => __awaiter(void 0, void 0, void 0, function* () {
    const tran_id = `TRN_${(0, uuid_1.v4)()}`;
    const data = {
        total_amount: payment.amount,
        currency: 'BDT',
        tran_id: tran_id,
        success_url: `http://localhost:3006/payments/success?tran_id=${tran_id}`,
        fail_url: `http://localhost:3006/payments/fail?tran_id=${tran_id}`,
        cancel_url: `http://localhost:3006/payments/cancel?tran_id=${tran_id}`,
        ipn_url: `http://localhost:3006/payments/ipn`,
        shipping_method: 'No',
        product_name: 'RideShare Trip',
        product_category: 'Transport',
        product_profile: 'general',
        cus_name: payment.userId, // Using userId as customer name for now
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
            const newPayment = Object.assign(Object.assign({}, payment), { id: (0, uuid_1.v4)(), status: 'pending', transactionId: tran_id, paymentGatewayUrl: apiResponse.GatewayPageURL });
            payments.push(newPayment);
            return newPayment;
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
const handlePaymentSuccess = (tran_id, val_id) => __awaiter(void 0, void 0, void 0, function* () {
    const payment = payments.find(p => p.transactionId === tran_id);
    if (payment) {
        // In a real application, you would validate the transaction with SSLCommerz here
        // const validation = await sslcz.validate({
        //   val_id: val_id,
        //   store_id: store_id,
        //   store_passwd: store_passwd,
        // });
        // if (validation.status === 'VALID') {
        payment.status = 'completed';
        payment.validationId = val_id;
        // }
        return payment;
    }
    return undefined;
});
exports.handlePaymentSuccess = handlePaymentSuccess;
const handlePaymentFail = (tran_id) => {
    const payment = payments.find(p => p.transactionId === tran_id);
    if (payment) {
        payment.status = 'failed';
        return payment;
    }
    return undefined;
};
exports.handlePaymentFail = handlePaymentFail;
const handlePaymentCancel = (tran_id) => {
    const payment = payments.find(p => p.transactionId === tran_id);
    if (payment) {
        payment.status = 'cancelled';
        return payment;
    }
    return undefined;
};
exports.handlePaymentCancel = handlePaymentCancel;
const handlePaymentIpn = (ipn_data) => __awaiter(void 0, void 0, void 0, function* () {
    // In a real application, you would validate the IPN data with SSLCommerz here
    // and update the payment status in your database.
    console.log('IPN Received:', ipn_data);
    const tran_id = ipn_data.tran_id;
    const payment = payments.find(p => p.transactionId === tran_id);
    if (payment) {
        // Example: update status based on IPN data
        if (ipn_data.status === 'VALID') {
            payment.status = 'completed';
            payment.validationId = ipn_data.val_id;
        }
        else if (ipn_data.status === 'FAILED') {
            payment.status = 'failed';
        }
        else if (ipn_data.status === 'CANCELLED') {
            payment.status = 'cancelled';
        }
        return payment;
    }
    return undefined;
});
exports.handlePaymentIpn = handlePaymentIpn;
