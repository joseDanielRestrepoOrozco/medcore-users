import express from 'express';
import cors from 'cors';
import router from './routes/router.js';
import unknownEndpoint from './middleware/unknownEndpoint.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/v1', router);

app.use(unknownEndpoint);
app.use(errorHandler);

export default app;
