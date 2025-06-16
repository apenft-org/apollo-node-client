import crypto from 'crypto';
import forge from 'node-forge';

function split(buffer: Buffer, size: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(buffer.slice(i, i + size));
  }
  return chunks;
}

/**
 * RSA工具类
 * 最佳实践：在应用启动时将字符格式的密钥转换为实例并缓存。
 */
export class RSAUtil {

  static decrypt(secretKey, encryptedData): string {
    // Decode the Base64 secret key
    const raw = Buffer.from(secretKey, 'base64');

    // Create a private key object
    const privateKey = crypto.createPrivateKey({
      key: raw,
      format: 'der',
      type: 'pkcs8'
    });


    const pem = privateKey.export({
      type: 'pkcs8',
      format: 'pem'
    });

    // 解密数据
    let decryptedChunks = '';
    const partLen = 512; // 计算部分长度

    const chunks = split(encryptedData, partLen);

    const pki = forge.pki;
    const rsa = pki.privateKeyFromPem(pem);

    for (const chunk of chunks) {
      const decryptedData = rsa.decrypt(chunk, 'RSAES-PKCS1-V1_5');
      console.log(decryptedData);
      decryptedChunks += decryptedData;
    }
    return decryptedChunks;
  }

}
