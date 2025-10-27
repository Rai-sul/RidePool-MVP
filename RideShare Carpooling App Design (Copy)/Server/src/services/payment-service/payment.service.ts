import { Payment } from './payment.model';
import SSLCommerzPayment from 'sslcommerz-lts';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const store_id = process.env.STORE_ID || 'YOUR_SSLCOMMERZ_STORE_ID';
const store_passwd = process.env.STORE_PASS || 'YOUR_SSLCOMMERZ_STORE_PASSWORD';
const is_live = false; // Set to true for live transactions

const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

const payments: Payment[] = []; // In-memory storage for payment records

export const initiatePayment = async (payment: Payment): Promise<Payment | undefined> => {
  const tran_id = `TRN_${uuidv4()}`;

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
    const apiResponse = await sslcz.init(data);
    if (apiResponse.GatewayPageURL) {
      const newPayment: Payment = {
        ...payment,
        id: uuidv4(),
        status: 'pending',
        transactionId: tran_id,
        paymentGatewayUrl: apiResponse.GatewayPageURL,
      };
      payments.push(newPayment);
      return newPayment;
    } else {
      console.error('SSLCommerz initiation failed: No GatewayPageURL', apiResponse);
      return undefined;
    }
  } catch (error) {
    console.error('SSLCommerz initiation error:', error);
    return undefined;
  }
};

export const handlePaymentSuccess = async (tran_id: string, val_id: string): Promise<Payment | undefined> => {
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
};

export const handlePaymentFail = (tran_id: string): Payment | undefined => {
  const payment = payments.find(p => p.transactionId === tran_id);
  if (payment) {
    payment.status = 'failed';
    return payment;
  }
  return undefined;
};

export const handlePaymentCancel = (tran_id: string): Payment | undefined => {
  const payment = payments.find(p => p.transactionId === tran_id);
  if (payment) {
    payment.status = 'cancelled';
    return payment;
  }
  return undefined;
};

export const handlePaymentIpn = async (ipn_data: any): Promise<Payment | undefined> => {
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
    } else if (ipn_data.status === 'FAILED') {
      payment.status = 'failed';
    } else if (ipn_data.status === 'CANCELLED') {
      payment.status = 'cancelled';
    }
    return payment;
  }
  return undefined;
};