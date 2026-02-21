const express = require('express');
const cors = require('cors');
const gaRoutes = require('./routes/gaRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/ga', gaRoutes);

app.get('/', (req, res) => {
  res.send('GA Schedule Backend is running');
});

app.listen(PORT, () => {
  console.log(`GA backend server listening on port ${PORT}`);
});
