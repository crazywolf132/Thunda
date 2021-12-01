import thunda from '@thunda/core';
import expressify from '@thunda/expressify'
import send from '@rayo/send';

const app = thunda({ port: 8080, lightning: {monitor: false}, useLightning: false });
app.through(expressify())
app.get('/', (req, res) => {
	res.status(404).send('lol')
	// res.end('Hello world')
})
// app.start(() => console.log('Running @ 8080'));
app.start(console.log)