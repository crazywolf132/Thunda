export default interface LightningOptions {
	keepAlive?: boolean;
	monitor?: boolean;
	master?: Function;
	port?: number;
	server?: any;
}