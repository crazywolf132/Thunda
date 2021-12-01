import http from 'http';
import parseurl from 'parseurl';
import { parse } from 'querystring';
import { lightning } from '@thunda/lightning';
import Bridge from './bridge';
import LightningOptions from './interfaces/lightningInterface';
import ThundaOptions from './interfaces/thundaInterface';

const getIp = (req) => {
	const { headers = {}, connection = {}, socket = {} } = req;
	const remoteAddress = connection.remoteAddress || socket.remoteAddress;
	const socketAddress = connection.socket ? connection.socket.remoteAddress : null;

	return headers['x-forwarded-for'] || remoteAddress || socketAddress
}

const final = (req, res, status, error) => {
	res.statusCode = status;
	res.setHeader('Content-Length', error.length);
	res.setHeader('Content-Type', 'text/plain');
	res.end(error);
}

class Thunda extends Bridge {

	private host: string;
	private port: number;
	private onError: Function;
	private notFound: Function;
	private server: any;
	private useLightning: boolean = true;
	private lightningOptions: LightningOptions = { keepAlive: true, monitor: false};


	constructor(options: ThundaOptions) {
		super();
		({
			host: this.host,
			port: this.port,
			onError: this.onError = null,
			notFound: this.notFound = null,
			server: this.server = null,
			useLightning: this.useLightning = true,
			lightning: this.lightningOptions = null
		} = options);
		this.dispatch = this.dispatch.bind(this);
	}

	start(cb = (addr: any) => { }) {
		const work = () => {
			this.server = this.server || http.createServer();
			this.server.listen(this.port, this.host);
			this.server.on('request', this.dispatch);
			this.server.once('listening', () => {
				this.through();
				const address = this.server.address();
				cb(address);
			})
		}

		if (this.useLightning) {
			lightning(work, this.lightningOptions);
		} else {
			work();
		}

		return this.server;
	}

	dispatch(req, res) {
		const parsedUrl = parseurl(req);
		req.ip = getIp(req);
		req.pathname = parsedUrl.pathname;
		req.query = parse(parsedUrl.query);

		let stack;
		const route = this.fetch(req.method, parsedUrl.pathname);
		if (!route) {
			stack = [
				this.notFound || (() => final(req, res, 404, `${req.method} ${parsedUrl.pathname} is undefined.`))
			];
		} else {
			req.params = route.params;
			({ stack } = route);
		}

		return this.step(req, res, this.throughs.concat(stack));
	}

	step(req, res, stack, error = null, statusCode: number = 400) {
		const fn = stack.shift();
		if (error) {
			return this.onError ? this.onError(error, req, res, fn) : final(req, res, statusCode, error);
		}

		if (fn) {
			return fn(req, res, this.step.bind(this, req, res, stack));
		}

		throw new Error('No handler to move to, the stack is empty!');
	}
}

const exp = (options = {}) => new Thunda(options);
export { exp as default, exp as Thunda }
// export default (options = {}) => new Thunda(options);
