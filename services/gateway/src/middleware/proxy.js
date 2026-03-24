import axios from 'axios';

export function proxyTo(baseUrl) {
  return async (req, res) => {
    try {
      const url = `${baseUrl}${req.originalUrl}`;
      const response = await axios({
        method:  req.method,
        url,
        data:    req.body,
        headers: {
          'content-type': 'application/json',
          'x-user-id':    req.headers['x-user-id']   || '',
          'x-user-role':  req.headers['x-user-role'] || '',
        },
      });
      res.status(response.status).json(response.data);
    } catch (err) {
      const status = err.response?.status || 500;
      res.status(status).json(err.response?.data || { error: err.message });
    }
  };
}
