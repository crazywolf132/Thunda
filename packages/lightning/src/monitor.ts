import parseurl from 'parseurl';
import { createServer, Server } from 'http';

const round = (number) => Math.round(number * 100) / 100;
const reform = (item) => {
	item.upTime = item.upTime ? Math.floor(item.upTime) : undefined;
	item.cpuTime = item.cpuTime ? round((item.cpuTime.user + item.cpuTime.system) / 1e6) : undefined;

	if (item.memory) {
		const keys = Object.keys(item.memory);
		for (const key of keys) {
			item.memory[key] = round(item.memory[key] / 1024 / 1024);
		}
	}
	return item;
}

const pre = (payload) => (Array.isArray(payload) ? payload.map(reform) : reform(payload));
const send = (res, data) => {
	res.setHeader('Content-Length', data.length);
	res.setHeader('X-Powered-by', '@thunda/lightning');
	res.end(data);
}

const requestDispatch = (cluster, res, { workerId, command}) => {
	if (workerId) {
		const worker = cluster.workers[workerId];
		if (!worker) {
			res.setHeader('Content-Type', 'text/plain');
			return send(res, `Worker ${workerId} does not exist`);
		}

		res.setHeader('Content-Type', 'application/json');
		worker.once('message', (message) => send(res, JSON.stringify(pre(message))));
		return worker.send(command);
	}

	const current = [];
	Object.keys(cluster.workers).forEach(worker => current.push({
		id: cluster.workers[worker].id,
		pid: cluster.workers[worker].process.pid,
		masterPid: cluster.masterPid,
		status: cluster.workers[worker].state
	}));
	
	res.setHeader('Content-Type', 'application/json');
	return send(res, JSON.stringify(pre(current)));
}

const requestHandler = (cluster, req, res) => {
	const { pathname } = parseurl(req);
	const [service, workerId, command = 'health'] = pathname.substr(1).split('/');

	if (service === 'monitor') {
		return requestDispatch.bind(null, cluster, res)({ workerId: parseInt(workerId, 10) || null, command});
	}

	res.statusCode = 404;
	return res.end('This service does not exist.');
}

// The `master` process sent this message/command to the worker

export const messageHandler = (process) => process.on('message', (cmd: string) => {
		let response = null;
		switch (cmd) {
			case 'health':
				response = {
					pid: process.pid,
					masterPid: process.ppid,
					platform: process.platform,
					upTime: process.uptime(),
					cpuTime: process.cpuUsage(),
					memory: process.memoryUsage()
				};
				break
		}

		return response ? process.send(pre(response)) : null;
	});

	export const monitor = {
		start: (cluster, { monitorPort = null, server = createServer() }) => {
		// @ts-expect-error
		this.httpServer = Server;
		// @ts-expect-error
		this.httpServer.listen(monitorPort);
		// @ts-expect-error
		this.httpServer.on('request', requestHandler.bind(null, cluster));
		// @ts-expect-error
		this.httpServer.on('listening', ()=> {
			// log here if they need.
		});
	},
	stop : () => {
		// @ts-expect-error
		if (this.httpServer) {
			// @ts-expect-error
			this.httpServer.close();
		}
	}
}