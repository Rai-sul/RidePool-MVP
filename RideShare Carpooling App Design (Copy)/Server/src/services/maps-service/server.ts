import express from 'express';
import mapsRouter from './index.js';

const app = express();
const port = 3007;

app.use(express.json());
app.use('/', mapsRouter);

app.listen(port, () => {
  console.log(`Maps service is running at http://localhost:${port}`);
});