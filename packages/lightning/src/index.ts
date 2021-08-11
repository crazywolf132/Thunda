import cluster from 'cluster';
import EventEmitter from 'events';
import os from 'os';
import LightningOptions from './interfaces/lightningOptions';
import { monitor, messageHandler } from './monitor';

const cpus = os.cpus();

class Lightning extends EventEmitter {

	private keepAlive: boolean;
	private monitor: boolean;
	private work: any;

	constructor(work, options: LightningOptions ) {
		super();

		if (!work || typeof work !== "function") {
			throw new Error('You need to provide a worker function.');
		}

		({
			keepAlive: this.keepAlive = true,
			monitor: this.monitor = false
		} = options);

		this.work = work.bind(this);
		this.fork = this.fork.bind(this);
		this.stop = this.stop.bind(this);

		if (cluster.isPrimary) {
			cluster.setupPrimary({ silent: true });
		}

		if (cluster.isWorker) {
			this.work();
			return messageHandler.bind(null, process)();
		}

		// @ts-expect-error
		return this.start(options);
	}

	start(options) {
		let processes = options.works || cpus.length;
		process.on('SIGINT', this.stop).on('SIGTERM', this.stop); // kill requests
		cluster.on('online', (worker) => {
			this.emit('worker', worker.process.pid);
		});
		cluster.on('exit', worker => {
			this.emit('exit', worker.process.pid);
			return this.fork(worker);
		});

		while (processes) {
			processes -= 1;
			cluster.fork(); // Starting a new fork of the work for each process.
		}

		// @ts-ignore
		cluster.masterPid = process.pid;
		if (options.master) {
			options.master = options.master.bind(this, cluster);
			options.master();
		}

		if (this.monitor) {
			monitor.start(cluster, options);
		}
	}
	stop() {
		monitor.stop();
		this.keepAlive = false;
		let index = Object.keys(cluster.workers).length;
		while (index) { // going through all the services and killing them
			if (cluster.workers[index]) {
				cluster.workers[index].process.kill();
				cluster.workers[index].kill();
			}
			index -= 1;
		}

		this.emit('offline');
		setTimeout(process.exit, 200);
	}
	fork(worker) {
		if (this.keepAlive) {
			// They want to keep this alive... so we are going to replace it with a new worker
			cluster.fork();
		}

		if (!Object.keys(cluster.workers).length) {
			monitor.stop();
		}
	}
}

export const lightning = (work = null, options = {}) => new Lightning(work, options);
export default Lightning;