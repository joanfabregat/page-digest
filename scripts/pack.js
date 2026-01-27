const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const ChromeExtension = require('crx');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const DIST_FILES = ['manifest.json', 'popup', 'dist', 'icons'];

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function createZip() {
  const output = fs.createWriteStream(path.join(ROOT, 'page-digest.zip'));
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Created page-digest.zip (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    for (const file of DIST_FILES) {
      const filePath = path.join(ROOT, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        archive.directory(filePath, file);
      } else {
        archive.file(filePath, { name: file });
      }
    }

    archive.finalize();
  });
}

async function createCrx() {
  const { execSync } = require('child_process');
  const keyPath = path.join(ROOT, 'key.pem');

  // Generate private key if it doesn't exist
  if (!fs.existsSync(keyPath)) {
    try {
      execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'pipe' });
      console.log('Generated key.pem (keep this safe for future updates!)');
    } catch (e) {
      console.log('Could not generate private key. Install openssl or create key.pem manually.');
      console.log('Skipping CRX creation, ZIP file is still available.');
      return;
    }
  }

  // Create temp directory with only the required files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'page-digest-'));
  try {
    for (const file of DIST_FILES) {
      const src = path.join(ROOT, file);
      const dest = path.join(tempDir, file);
      copyRecursiveSync(src, dest);
    }

    const privateKey = fs.readFileSync(keyPath);
    const crx = new ChromeExtension({ privateKey });

    await crx.load(tempDir);
    const crxBuffer = await crx.pack();

    fs.writeFileSync(path.join(ROOT, 'page-digest.crx'), crxBuffer);
    console.log(`Created page-digest.crx`);
  } catch (err) {
    console.error('Failed to create CRX:', err.message || err);
    console.log('Skipping CRX creation, ZIP file is still available.');
  } finally {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  await createZip();
  await createCrx();
}

main().catch(console.error);
