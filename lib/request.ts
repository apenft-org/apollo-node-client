import fetch, {HeadersInit} from 'node-fetch';
import {stringify} from 'query-string';
import {ConfigInterface} from './configInterface';
import {RSAUtil} from './RSAUtil';

export type ConfigUrlOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  namespaceName: string;
  releaseKey?: string;
  ip?: string;
};

export type NotificationsUrlOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
};

export type ConfigQueryParam = {
  releaseKey: string;
  ip: string;
};

export type Notification = {
  namespaceName: string;
  notificationId: number;
};

export type LoadConfigResp<T> = {
  appId: string;
  cluster: string;
  namespaceName: string;
  configurations: T;
  releaseKey: string;
}

export class Request {
  public static formatConfigUrl(urlOptions: ConfigUrlOptions): string {
    const {appId, clusterName, namespaceName, configServerUrl, releaseKey, ip} = urlOptions;
    const url = configServerUrl.endsWith('/') ? configServerUrl.substring(0, configServerUrl.length - 1) : configServerUrl;
    const params: ConfigQueryParam = Object.create(null);
    if (releaseKey) {
      params.releaseKey = releaseKey;
    }
    if (ip) {
      params.ip = ip;
    }
    return `${url}/configs/${appId}/${clusterName}/${namespaceName}?${stringify(params)}`;
  }

  public static async fetchConfig<T>(url: string, headers?: HeadersInit): Promise<LoadConfigResp<T> | null> {
    const response = await fetch(url, {headers});
    const status = response.status;
    if (status === 304) return null;
    if (status != 200) throw new Error(`Http request error: ${status}, ${response.statusText}`);

    let text = '';
    // 由服务端来决定是否要加密
    if (
      (response.headers.has('HTX_CRYPTO_ENABLE') && response.headers.get('HTX_CRYPTO_ENABLE') === 'true')
    ) {
      console.debug('apollo private key enabled.');
      const SecretKeyA = process.env.APOLLO_SECRET_KEY;
      const SecretKeyB = process.env.ApolloPrivateKey;

      let privateKey: string;
      if (SecretKeyA) {
        privateKey = SecretKeyA;
      } else if (SecretKeyB) {
        privateKey = SecretKeyB;
      } else {
        throw new Error('no private key!!');
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);
      // console.log('binaryData', binaryData);

      const decrypt = RSAUtil.decrypt(privateKey, binaryData);
      // console.debug('decrypt',decrypt);
      text = decrypt;
    } else {
      text = await response.text();
      // console.log(`text: ${text}`);
    }
    if (!text) return null;
    // console.log('fetchConfig', text);
    return JSON.parse(text);
  }

  public static formatNotificationsUrl(options: NotificationsUrlOptions,configsMap: Map<string, ConfigInterface>): string {
    const {configServerUrl, appId, clusterName} = options;
    const url = configServerUrl.endsWith('/') ? configServerUrl.substring(0, configServerUrl.length - 1) : configServerUrl;
    const notifications: Notification[] = [];
    for (const config of configsMap.values()) {
      const temp = {
        namespaceName: config.getNamespaceName(),
        notificationId: config.getNotificationId(),
      };
      notifications.push(temp);
    }
    const strParams = stringify({
      appId: appId,
      cluster: clusterName,
      notifications: JSON.stringify(notifications),
    });
    return `${url}/notifications/v2?${strParams}`;
  }

  public static async fetchNotifications(url: string, headers?: HeadersInit): Promise<Notification[] | null> {
    const response = await fetch(url, {headers, timeout: 70000});
    const status = response.status;
    const text = await response.text();
    if (status === 304) return null;
    if (status != 200) throw new Error(`Http request error: ${status}, ${response.statusText}`);
    if (!text) return null;
    return JSON.parse(text);
  }
}
