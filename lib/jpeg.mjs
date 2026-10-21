// Structural input validation; persistent media also requires a full Sharp decode.
export function inspectJpeg(bytes) {
  if (bytes.length < 24 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('JPEG 不完整。');
  let offset = 2, dimensions;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 255) throw new Error('JPEG 标记无效。');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218) {
      const length = bytes.readUInt16BE(offset);
      if (!dimensions || length < 6 || offset + length >= bytes.length - 2) throw new Error('JPEG 扫描数据无效。');
      return dimensions;
    }
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('JPEG 段不完整。');
    if ([192,193,194].includes(marker)) {
      if (length < 8) throw new Error('JPEG 尺寸无效。');
      const height = bytes.readUInt16BE(offset + 3), width = bytes.readUInt16BE(offset + 5);
      if (width < 320 || height < 180 || width * height > 100000000) throw new Error('图片尺寸异常，可能是占位图。');
      dimensions = { width, height };
    }
    offset += length;
  }
  throw new Error('JPEG 缺少图像数据。');
}
