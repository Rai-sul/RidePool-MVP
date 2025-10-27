import express from 'express';
import profileRouter from './index.js';

const app = express();
const port = 3001;

app.use(express.json());
app.use('/', profileRouter);

app.listen(port, () => {
  console.log(`Profile service is running at http://localhost:${port}`);
});
