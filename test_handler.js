const handler = require('./api/buscar-marketplace');

const req = { method: 'POST', body: { query: 'hb20' } };
const res = {
  setHeader: () => {},
  status: (code) => {
    console.log("Status:", code);
    return {
      json: (data) => console.log("JSON:", data),
      end: () => console.log("END")
    };
  }
};

handler(req, res).catch(console.error);
