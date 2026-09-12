type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

function serializeError(error: unknown): LogContext {
  if (!(error instanceof Error)) return { error };
  return {
    errorName: error.name,
    errorMessage: error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  };
}

function write(level: LogLevel, event: string, context: LogContext = {}): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });

  if (level === 'error') console.error(record);
  else if (level === 'warn') console.warn(record);
  else console.info(record);
}

export const logger = {
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, error?: unknown, context: LogContext = {}) =>
    write('error', event, { ...context, ...serializeError(error) }),
};
