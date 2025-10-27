import { Request, Response } from 'express';
import * as paymentService from './payment.service';
import { Payment } from './payment.model';

export const initiatePayment = async (req: Request, res: Response) => {
  const payment: Payment = req.body;
  const result = await paymentService.initiatePayment(payment);
  if (result && result.paymentGatewayUrl) {
    res.redirect(result.paymentGatewayUrl); // Redirect to SSLCommerz payment gateway
  } else {
    res.status(500).json({ message: 'Payment initiation failed.' });
  }
};

export const handleSuccess = async (req: Request, res: Response) => {
  const { tran_id, val_id } = req.query;
  if (typeof tran_id === 'string' && typeof val_id === 'string') {
    const payment = await paymentService.handlePaymentSuccess(tran_id, val_id);
    if (payment) {
      res.status(200).send(`Payment for transaction ${tran_id} successful. Validation ID: ${val_id}`);
    } else {
      res.status(400).send(`Payment success for transaction ${tran_id} could not be processed.`);
    }
  } else {
    res.status(400).send('Invalid success callback parameters.');
  }
};

export const handleFail = (req: Request, res: Response) => {
  const { tran_id } = req.query;
  if (typeof tran_id === 'string') {
    const payment = paymentService.handlePaymentFail(tran_id);
    if (payment) {
      res.status(400).send(`Payment for transaction ${tran_id} failed.`);
    } else {
      res.status(400).send(`Payment failure for transaction ${tran_id} could not be processed.`);
    }
  } else {
    res.status(400).send('Invalid fail callback parameters.');
  }
};

export const handleCancel = (req: Request, res: Response) => {
  const { tran_id } = req.query;
  if (typeof tran_id === 'string') {
    const payment = paymentService.handlePaymentCancel(tran_id);
    if (payment) {
      res.status(200).send(`Payment for transaction ${tran_id} cancelled.`);
    } else {
      res.status(400).send(`Payment cancellation for transaction ${tran_id} could not be processed.`);
    }
  } else {
    res.status(400).send('Invalid cancel callback parameters.');
  }
};

export const handleIpn = async (req: Request, res: Response) => {
  const ipn_data = req.body;
  const payment = await paymentService.handlePaymentIpn(ipn_data);
  if (payment) {
    res.status(200).send('IPN received and processed.');
  } else {
    res.status(400).send('IPN could not be processed.');
  }
};