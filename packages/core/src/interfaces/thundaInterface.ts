import LightningOptions from "./lightningInterface";

export default interface ThundaOptions {
	host?: string;
	port?: number;
	onError?: Function;
	notFound?: Function;
	server?: any;
	useLightning?: boolean;
	lightning?: LightningOptions
}