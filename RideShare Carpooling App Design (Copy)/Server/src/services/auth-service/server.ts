import express from 'express';
import authRouter from './index.js';

const app = express();
const port = 3002;

app.use(express.json());
app.use('/', authRouter);

app.listen(port, () => {
  console.log(`Auth service is running at http://localhost:${port}`);
});
