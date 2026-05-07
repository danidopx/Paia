const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const aiHandler = require('./api/ai');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));
app.post('/api/ai', (req, res) => aiHandler(req, res));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Paia local server running on http://localhost:${port}`));
