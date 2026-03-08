
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const url = 'https://p3vg7miuxvs2y9yp.public.blob.vercel-storage.com/receipts/1769953753735_7489-WROF1ty22JDYTm4VAGu1AbcI5hMgnV.jpg';
const token = process.env.BLOB_READ_WRITE_TOKEN;

async function testFetch() {
  console.log(`Testing fetch for: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Plain fetch status: ${res.status} ${res.statusText}`);

    if (token) {
      const resAuth = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Auth fetch status: ${resAuth.status} ${resAuth.statusText}`);
    } else {
      console.log('No token found in .env');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testFetch().catch(console.error);
