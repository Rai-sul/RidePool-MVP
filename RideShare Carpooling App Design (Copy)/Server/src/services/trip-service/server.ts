import express from 'express';
import tripRouter from './index.js';

const app = express();
const port = 3003;

app.use(express.json());
app.use('/', tripRouter);

app.listen(port, () => {
  console.log(`Trip service is running at http://localhost:${port}`);
});
