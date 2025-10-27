import express from 'express';
import paymentRouter from './index.js';

const app = express();
const port = 3006;

app.use(express.json());
app.use('/', paymentRouter);

app.listen(port, () => {
  console.log(`Payment service is running at http://localhost:${port}`);
});
