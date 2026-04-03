export interface ReducerCallOptions {
  fullUpdate?: boolean;
  noSuccessNotify?: boolean;
}

export interface ReducerEventContext {
  callerIdentity: string;
  error?: string;
  status: "Committed" | "Failed" | "OutOfEnergy";
  timestamp: bigint;
}

export interface ReducerWrapper<TInput, TResult> {
  onCall: (
    callback: (ctx: ReducerEventContext, input: TInput) => void
  ) => () => void;
  setFlags: (flags: ReducerCallOptions) => void;
  (input: TInput): Promise<TResult>;
}

export function createNoOpReducer<TInput, TResult = void>(): ReducerWrapper<
  TInput,
  TResult
> {
  const stub = (_input: TInput): Promise<TResult> => {
    return Promise.reject(
      new Error(
        "Reducer not connected. Use createChorusReducers() with a connected DbConnection."
      )
    );
  };

  stub.setFlags = () => {
    throw new Error("Reducer not connected");
  };

  stub.onCall = () => {
    return () => {
      // no-op unsubscribe for stub reducer
    };
  };

  return stub;
}
