import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedHosts, hostAllowed, hostnameOf, originAllowed } from '../server/guard';

test('the API answers to loopback, the named hosts and a specific bound address, never to a stranger', () => {
  const allowed = allowedHosts({ CONJURE_ALLOWED_HOSTS: 'rack, Rack.local', CONJURE_HOST: '0.0.0.0' });
  for (const host of ['localhost:3400', '127.0.0.1:3400', '[::1]:3400', 'rack:3400', 'rack.local', 'RACK.LOCAL:3400']) assert.ok(hostAllowed(host, allowed), host);
  for (const host of ['attacker.example:3400', 'rack.local.attacker.example', 'conjure.attacker.example:3400', '', undefined]) assert.equal(hostAllowed(host, allowed), false, String(host));
  assert.ok(hostAllowed('10.0.0.4:3400', allowed), 'a bare address is allowed, as Vite allows it for the page');
  assert.ok(hostAllowed('[fe80::1]:3400', allowed));
  assert.equal(allowedHosts({ CONJURE_HOST: '0.0.0.0' }).has('0.0.0.0'), false, 'binding everywhere is not a name');
  assert.equal(hostnameOf('[::1]:3400'), '::1');
  assert.equal(hostnameOf('not a host'), null);
});

test('an Origin, when sent, must name the very host that was asked', () => {
  assert.ok(originAllowed(undefined, 'rack.local:3400'));
  assert.ok(originAllowed('http://rack.local:3400', 'rack.local:3400'));
  assert.equal(originAllowed('http://attacker.example', 'rack.local:3400'), false);
  assert.equal(originAllowed('null', 'rack.local:3400'), false);
});
