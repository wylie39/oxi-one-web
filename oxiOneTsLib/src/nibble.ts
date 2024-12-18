export function deNibblize(buf: number[], data: number[], offset: number): void {
  let count = 0;
  for (let it = offset; it < data.length; ++it) {
    const byte = data[it];

    if ((count & 1) === 0) {
      const byteHigh = (byte << 4) & 0xf0; // byte high
      buf.push(byteHigh);
    } else {
      const size = buf.length - 1;
      buf[size] |= byte & 0xf;
    }
    count++;
  }
}

export function nibblize(buf: number[], data: number[], length: number): void {
  for (let it = 0; it < length; ++it) {
    const byte = data[it];
    const byteHigh = (byte >> 4) & 0x0f;
    buf.push(byteHigh);
    const byteLow = byte & 0xf;
    buf.push(byteLow);
  }
}
