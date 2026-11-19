import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWifi, escapeWifi, pixelLayout, qrPath, qrSvg } from "../src/lib/kit/qrcode.ts";

test("escapeWifi backslash-escapes special characters", () => {
  assert.equal(escapeWifi("plain"), "plain");
  assert.equal(escapeWifi('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f');
  assert.equal(escapeWifi("角度偏爱的家"), "角度偏爱的家");
});

test("buildWifi produces the WIFI: payload", () => {
  assert.equal(
    buildWifi({ ssid: "Summer", password: "sea&sun", security: "WPA", hidden: false }),
    "WIFI:T:WPA;S:Summer;P:sea&sun;H:false;;",
  );
  assert.equal(
    buildWifi({ ssid: "My;Net", password: 'p:"w"', security: "WEP", hidden: true }),
    'WIFI:T:WEP;S:My\\;Net;P:p\\:\\"w\\";H:true;;',
  );
  assert.equal(
    buildWifi({ ssid: "Cafe", password: "ignored", security: "nopass", hidden: false }),
    "WIFI:T:nopass;S:Cafe;H:false;;",
  );
});

test("qrPath draws horizontal runs", () => {
  assert.equal(
    qrPath([
      [true, true, false],
      [false, true, true],
      [true, false, true],
    ]),
    "M0 0h2v1h-2zM1 1h2v1h-2zM0 2h1v1h-1zM2 2h1v1h-1z",
  );
  assert.equal(qrPath([[false, false]]), "");
});

test("qrSvg builds a standalone document", () => {
  const svg = qrSvg(
    [
      [true, false],
      [false, true],
    ],
    { foreground: "#0b3b4a", background: "#ffffff", size: 512 },
  );
  assert.ok(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2" width="512"'),
  );
  assert.ok(svg.includes('fill="#ffffff"'));
  assert.ok(svg.includes('<path d="M0 0h1v1h-1zM1 1h1v1h-1z" fill="#0b3b4a"/>'));
  const hostile = qrSvg([[true]], { foreground: '"><x', background: "#fff", size: 1 });
  assert.ok(hostile.includes('fill="&quot;>&lt;x"'));
});

test("pixelLayout keeps modules integer and centred", () => {
  assert.deepEqual(pixelLayout(29, 1024), { moduleSize: 35, offset: 4 });
  assert.deepEqual(pixelLayout(25, 1000), { moduleSize: 40, offset: 0 });
  assert.deepEqual(pixelLayout(193, 256), { moduleSize: 1, offset: 31 });
  assert.deepEqual(pixelLayout(300, 256), { moduleSize: 1, offset: 0 });
});
