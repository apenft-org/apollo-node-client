import crypto from 'crypto';
import CryptoJSW from '@originjs/crypto-js-wasm';

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

  static async decrypt(SecretKey: string, encryptedData: Buffer): Promise<string> {

    // 解码 Base64 私钥
    const raw = Buffer.from(SecretKey, 'base64');

    // 创建私钥对象
    const privateKey = crypto.createPrivateKey({
      key: raw,
      format: 'der',
      type: 'pkcs8'
    });

    const pem = privateKey.export({
      type:'pkcs8',
      format:'pem'
    });

    await CryptoJSW.RSA.loadWasm();
    const config = {
      encryptPadding: 'OAEP',
      signPadding: 'PSS',
      hashAlgo: 'md5',
      key: pem.toString(),
      isPublicKey: false
    };

    CryptoJSW.RSA.updateConfig(config);

    // 解密数据
    const decryptedChunks: Uint8Array[] = [];
    const partLen = 512; // 计算部分长度

    const chunks = split(encryptedData, partLen);
    for (const chunk of chunks) {
      const decrypted = CryptoJSW.RSA.decrypt(chunk, {encryptPadding: 'pkcs1v15',});
      decryptedChunks.push(decrypted);
    }

    // 合并解密后的数据
    const result = Buffer.concat(decryptedChunks);
    return result.toString();

  }
}
