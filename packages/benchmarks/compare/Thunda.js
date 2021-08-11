const thunda = require('@thunda/core').default;

const app = thunda({ port: 5050, lightning: { monitor: false } });
const handler = (req, res) => {
	res.end(`My name is... ${req.params.alias}`);
};

app.get('/users/:alias', handler).start();
