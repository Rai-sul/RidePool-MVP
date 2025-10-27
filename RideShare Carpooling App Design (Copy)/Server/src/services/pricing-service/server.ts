import express from 'express';
import pricingRouter from './index.js';

const app = express();
const port = 3005;

app.use(express.json());
app.use('/', pricingRouter);

app.listen(port, () => {
  console.log(`Pricing service is running at http://localhost:${port}`);
});
