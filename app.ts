import express from 'express';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';

const app = express();
const cache = new NodeCache();

interface Badge {
  label: string,
  message: string,
  color: string,
  style: string,
  logo: string,
}

async function createBadge(badge: Badge) {
  const url = new URL(`http://img.shields.io/badge/label-${badge.message}-${badge.color}`);
  url.searchParams.append('style', badge.style);
  url.searchParams.append('logo', badge.logo);
  url.searchParams.append('label', badge.label);

  if (cache.has(url.toString())) {
    return cache.get(url.toString()) as string;
  }

  const response = await fetch(url);
  const body = await response.text();
  cache.set(url.toString(), body);
  return body;
}

app.use(express.static(__dirname + '/frontend/build', { index: false }));
app.get('/*', async (req, res) => {

  if (!("app" in req.query)) {
    return res.status(200).sendFile(__dirname + '/frontend/build/index.html');
  }

  const appName = req.query.app;
  const root = req.query.root ?? '';
  const style = req.query.style ?? 'flat';
  const label = req.query.label ?? req.query.name ?? 'vercel'
  const logo = req.query.logo ?? 'vercel';

  const url = appName + '.vercel.app/' + root;
  const handleRequest = async (statusCode: number = 404) => {
    const badge: Badge = {
      label: label as string,
      message: 'deployed',
      color: 'brightgreen',
      style: style as string,
      logo: logo as string,
    };

    if (statusCode <= 599 && statusCode >= 500) {
      // 500 - 599 -> Server Errors
      badge.message = 'failed';
      badge.color = 'red';
    } else if (statusCode <= 499 && statusCode >= 400) {
      // 400 - 499 -> Client Errors
      badge.message = 'not found';
      badge.color = 'lightgrey';
    } else if (statusCode <= 399 && statusCode >= 300) {
      // 300 - 399 -> Redirects
    }

    // 200 - 299 -> Successful Responses
    // 100 - 199 -> Informational Responses

    createBadge(badge)
      .then(badge => res.setHeader('Content-type', 'image/svg+xml').status(200).send(badge))
      .catch(_ => res.status(500).send('Internal Server Error. Please open an issue at <a href="https://github.com/therealsujitk/vercel-badge/issues">vercel-badge/issues</a>.'));
  };

  fetch(`http://${url}`)
    .then(response => handleRequest(response.status))
    .catch(_ => handleRequest());
});

export default app;
