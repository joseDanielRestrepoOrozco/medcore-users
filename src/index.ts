import app from './app.js';
import { PORT } from './libs/config.js';

app.listen(PORT, () => {
  console.log(`Users Service is running on port ${PORT}`);
});
