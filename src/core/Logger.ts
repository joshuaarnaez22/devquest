type Level = 'debug' | 'warn' | 'error';

function format(scope: string, msg: string): string {
  return `[${scope}] ${msg}`;
}

function emit(level: Level, scope: string, msg: string, data?: unknown): void {
  const line = format(scope, msg);
  if (level === 'warn') {
    if (data !== undefined) console.warn(line, data);
    else console.warn(line);
  } else if (level === 'error') {
    if (data !== undefined) console.error(line, data);
    else console.error(line);
  } else if (import.meta.env.DEV) {
    if (data !== undefined) console.warn(`[debug] ${line}`, data);
    else console.warn(`[debug] ${line}`);
  }
}

export const log = {
  debug(scope: string, msg: string, data?: unknown): void {
    if (import.meta.env.DEV) emit('debug', scope, msg, data);
  },
  warn(scope: string, msg: string, data?: unknown): void {
    emit('warn', scope, msg, data);
  },
  error(scope: string, msg: string, err?: unknown): void {
    emit('error', scope, msg, err);
  },
};
