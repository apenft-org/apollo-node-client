export type ConfigOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  namespaceName: string;
  secret?: string;
  privateKey?: string;
}

export type ConfigContentType = {
  content: string;
}
