import { METHODS } from 'http'
import { exec, match, parse } from 'matchit'

const bridges = [];
const bridgeThrough = (context) => {
	bridges.forEach(bridge => {
		Object.keys(bridge.routes).forEach((method: string) => {
			context.routes[method] = bridge.routes[method].contact(context.routes[method] || []);
		});

		Object.keys(bridge.stack).forEach((method: string) => {
			context.stack[method] = context.stack[method] || {};
			Object.keys(bridge.stack[method]).forEach((path: string) => {
				context.stack[method][path] = bridge.stack[method][path].concat(context.stack[method][path] || [])
			})
		})
	})
}

class Bridge {

	id: string;
	routes;
	stack: object[];
	throughs: object[];
	bridgedPath: string | null;
	bridge;

	constructor(path: string = null) {
		this.id = process.hrtime().join('');
		this.routes = [];
		this.stack = [];
		this.throughs = [];
		this.bridgedPath = path;

		this.addMethods(path);

		if (!path) {
			this.throughs = [];
			this.bridge = (bridgedPath: string): any => {
				const bridge = new Bridge(bridgedPath);
				bridges.push(bridge);
				return bridge;
			}
		}

	}

	addMethods(path: string): void {
		METHODS.push('all'); // Adding the all method.
		METHODS.forEach((method) => {
			const bind = [method];
			if (path) {
				bind.push(path);
			}
			this[method.toLowerCase()] = this.route.bind(this, ...bind);
		})
	}

	route(method: string, path: string, ...handlers) {
		const set = (_method: string) => {
			this.routes[_method] = [...(this.routes[_method] ?? []), parse(path)];
			this.stack[_method] = { ...(this.stack[_method] ?? []), [path]: ((this.stack[_method] ?? {})[path] ?? []).concat(handlers) };
		};

		if (method === 'all') {
			// We are creating one for every method we know of
			METHODS.forEach(_method => (_method !== 'all' ? set(_method) : null))
		} else {
			set(method); // Just creating one for the method that was added :)
		}

		return this;
	}

	through(...handlers) {
		if (!handlers.length) {
			this.throughs = this.stack['*'] && this.stack['*']['*'] ? this.stack['*']['*'] : [];
			return bridgeThrough(this);
		}

		const [method, path] = this.bridgedPath ? ['all', this.bridgedPath] : ['*', '*'];
		return this.route(method, path, ...handlers);
	}

	fetch(method, path) {
		const url = match(path, this.routes[method] || []);
		return !url.length ? null : { params: exec(path, url), stack: this.stack[method][url[0].old] }
	}
}

export default Bridge;