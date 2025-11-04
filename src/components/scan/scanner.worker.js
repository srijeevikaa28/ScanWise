import jsQR from 'jsqr';

self.onmessage = event => {
  const { data, width, height } = event.data;
  // inversionAttempts: 'attemptBoth' is more robust and will try both standard and inverted QR codes.
  const code = jsQR(data, width, height, {
    inversionAttempts: "attemptBoth",
  });
  if (code) {
    self.postMessage(code.data);
  } else {
    self.postMessage(null);
  }
};
