import express from 'express';
import dispatchRouter from './index.js';

const app = express();
const port = 3004;

app.use(express.json());
app.use('/', dispatchRouter);

app.listen(port, () => {
  console.log(`Dispatch service is running at http://localhost:${port}`);
});
