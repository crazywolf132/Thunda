const fastify = require('fastify')();

const schema = {
	schema: {
		response: {
			200: {
				type: 'object',
				properties: {
					hello: {
						type: 'string',
					},
				},
			},
		},
	},
};
const handler = (req, reply) => {
	reply.send(`My name is... ${req.params.alias}`);
};

fastify.get('/users/:alias', schema, handler).listen(5050);
