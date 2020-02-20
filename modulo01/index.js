const express = require('express');

const server = express();

server.get('/', (req,res) => {

  return res.json({ message: 'Hello world'});
});
server.listen(4000);