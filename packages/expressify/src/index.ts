import { prototype } from 'events';
import http, { get } from 'http';

const _res = Object.create(http.ServerResponse.prototype);

_res.send = function(payload) {this.end(payload);}
_res.status = function(code) { this.statusCode = code; return this;}
_res.links = function(links) {
	var link = this.get('Link') || '';
	if (link) link += ', ';
	return this.set('Link', link + Object.keys(links).map(rel => {
		return '<' +  links[rel] + '>; rel="' + rel + '"'
	}).join(', '))
}

export default () => (req, res, step) => {
	Object.assign(res, _res);
	step();
}