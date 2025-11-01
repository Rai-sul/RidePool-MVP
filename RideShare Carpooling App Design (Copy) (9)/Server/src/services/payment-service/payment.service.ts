/// <reference types="uuid" />
import SSLCommerzPayment from 'sslcommerz-lts';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export enum PaymentStatus {
  PENDING = 0,
  COMPLETED = 1,
  FAILED = 2,
  REFUNDED = 3,
}

export interface Payment {
  id: string;
  userId: string;
  tripId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId: string;
  gatewayResponse: string;
  paymentUrl?: string;
}

const store_id = process.env.STORE_ID || 'YOUR_SSLCOMMERZ_STORE_ID';
const store_passwd = process.env.STORE_PASS || 'YOUR_SSLCOMMERZ_STORE_PASSWORD';
const is_live = false; // Set to true for live transactions

const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

const payments: Payment[] = []; // In-memory storage for payment records

export const initiatePayment = async (userId: string, tripId: string, amount: number, currency: string): Promise<{ paymentUrl: string, transactionId: string } | undefined> => {
  const tran_id = `TRN_${uuidv4()}`;

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
    const apiResponse = await sslcz.init(data);
    if (apiResponse.GatewayPageURL) {
      const newPayment: Payment = {
        id: uuidv4(),
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
    } else {
      console.error('SSLCommerz initiation failed: No GatewayPageURL', apiResponse);
      return undefined;
    }
  } catch (error) {
    console.error('SSLCommerz initiation error:', error);
    return undefined;
  }
};

export const handlePaymentCallback = async (transactionId: string, status: string, gatewayResponse: string): Promise<Payment | undefined> => {
  const payment = payments.find(p => p.transactionId === transactionId);
  if (payment) {
    // In a real application, you would validate the transaction with SSLCommerz here
    // and update the payment status in your database.
    if (status === 'VALID') {
      payment.status = PaymentStatus.COMPLETED;
    } else if (status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
    }
    payment.gatewayResponse = gatewayResponse;
    return payment;
  }
  return undefined;
};
