declare const process: {
  env?: Record<string, string | undefined>;
};

export type ServerEnv = Record<string, string | undefined>;

export function getServerEnv(): ServerEnv {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}
