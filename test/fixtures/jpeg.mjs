import sharp from 'sharp';
const images=new Map();
for(const [width,height] of [[80,80],[800,1080],[1920,1080],[3840,2160]]) {
  images.set(`${width}x${height}`,await sharp({create:{width,height,channels:3,background:'#6f8295'}}).jpeg({quality:90}).toBuffer());
}
export function jpeg(width=1920,height=1080) {
  const bytes=images.get(`${width}x${height}`);
  if(!bytes)throw new Error('Unknown JPEG fixture dimensions');
  return bytes;
}
