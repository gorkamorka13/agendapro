
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function test() {
  console.log(`Testing R2 Connection...`);
  console.log(`Account ID: ${process.env.R2_ACCOUNT_ID}`);
  console.log(`Access Key ID: ${process.env.R2_ACCESS_KEY_ID}`);
  console.log(`Bucket: ${process.env.R2_BUCKET}`);

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      MaxKeys: 1
    });
    const response = await s3Client.send(command);
    console.log('Success! Connection established.');
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('R2 Connection Failed:');
    console.error(err);
  }
}

test().catch(console.error);
