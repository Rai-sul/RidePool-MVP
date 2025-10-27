import express from 'express';
import notificationsRouter from './index.js';

const app = express();
const port = 3008;

app.use(express.json());
app.use('/', notificationsRouter);

app.listen(port, () => {
  console.log(`Notifications service is running at http://localhost:${port}`);
});