'use strict';

var FormData = require('form-data');
var Wreck = require('wreck');
var config = require('prefect-worker-config');
var sign = require('@tagplay/cloudinary-signature');

if (!config || !config.cloudinary) {
  throw new Error('Missing config for Cloudinary');
}
var cloudinary = config.cloudinary;

var log = config.log;

module.exports = upload;

function upload(file, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var url = [
    'https://api.cloudinary.com',
    'v1_1',
    cloudinary.cloud_name,
    'auto',
    'upload'
  ].join('/');
  var signedParams = sign(cloudinary.api_key, cloudinary.api_secret, options);
  log.debug({ url: url, params: signedParams }, 'Cloudinary data');

  var form = new FormData();
  form.append('file', file);
  Object.keys(signedParams).forEach(function(key) {
    if (key === 'tags' && typeof signedParams[key] !== 'string') {
      form.append('tags', signedParams[key].sort().join(','));
    } else {
      form.append(key, signedParams[key]);
    }
  });

  Wreck.post(
    url,
    {
      headers: form.getHeaders(),
      payload: form
    },
    function(err, res, payload) {
      if (payload) payload = JSON.parse(payload);
      if (payload && payload.error) err = payload.error;
      if (err) log.debug({ err: err }, 'Problem requesting');
      cb(err, payload);
    }
  );
}
