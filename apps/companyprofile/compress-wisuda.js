const { processGlb } = require('gltf-pipeline');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, 'public', 'models', 'wisudawan-3d.glb');
const output = path.join(__dirname, 'public', 'models', 'wisudawan-3d.glb');

const options = {
  dracoOptions: {
    compressionLevel: 7,
    encodeSpeed: 5,
    method: 'MESHLET',
    positionQuantization: 14,
    texCoordQuantization: 12,
    normalQuantization: 10,
    colorQuantization: 8,
  },
};

(async () => {
  try {
    const glb = fs.readFileSync(input);
    console.log('Input size:', (glb.length / 1e6).toFixed(2), 'MB');

    const result = await processGlb(glb, options);
    const out = result instanceof Uint8Array ? result : result.glb;
    fs.writeFileSync(output, out);
    console.log('Output size:', (out.length / 1e6).toFixed(2), 'MB');
    console.log('Done.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
