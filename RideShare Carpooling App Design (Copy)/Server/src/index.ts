import express from 'express';
import profileRouter from './services/profile-service/index.js';
import authRouter from './services/auth-service/index.js';

const app = express();
const port = 3000;

app.use(express.json());
app.use('/api', profileRouter);
app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
