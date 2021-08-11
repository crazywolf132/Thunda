const thunda = require('@thunda/core').default;
const app = thunda({ port: 8080 });
app.route('GET', '/', (req, res) => res.end('hello'));
app.start();
