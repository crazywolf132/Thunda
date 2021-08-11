const polka = require('polka');

const app = polka();
const handler = (req, res) => {
	res.end(`My name is... ${req.params.alias}`);
};

app.get('/users/:alias', handler).listen(5050);
