const path = require('path');
const fs = require('fs-extra');
const { spawnSync } = require('child_process');

(async function () {
  const rootDir = path.resolve(__dirname, '../');
  const distDir = path.join(rootDir, 'dist');
  const zipPath = path.join(rootDir, 'dist.zip');

  await fs.copy(
    path.resolve(rootDir, '../extension-ui/build'),
    distDir,
    {
      overwrite: true,
    }
  );
  await fs.copy(
    path.join(rootDir, 'service-worker.js'),
    path.join(distDir, 'service-worker.js')
  );
  await fs.copy(
    path.join(rootDir, 'manifest.json'),
    path.join(distDir, 'manifest.json'),
    {
      overwrite: true,
    }
  );

  await fs.writeFile(
    path.join(distDir, 'LOAD_HERE.txt'),
    [
      'Load this extension from THIS folder (dist), not the parent extension/ folder.',
      '',
      'Firefox:',
      '  about:debugging -> Load Temporary Add-on -> select manifest.json in THIS folder',
      '',
      'Chrome / Brave / Edge:',
      '  chrome://extensions -> Load unpacked -> select THIS dist folder',
      '',
    ].join('\n'),
    'utf8'
  );

  // Firefox/store zips need manifest.json at the archive root — not inside a dist/ folder.
  await fs.remove(zipPath);
  const zipResult = spawnSync(
    'tar',
    ['-caf', zipPath, '-C', distDir, '.'],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );
  if (zipResult.status !== 0) {
    console.warn('Could not create dist.zip (tar failed). Load manifest.json from dist/ instead.');
  } else {
    console.log(`Packaged extension zip to ${zipPath}`);
  }

  console.log(`Bundled extension to ${distDir}`);
})();
