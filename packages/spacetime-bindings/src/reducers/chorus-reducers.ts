import type {
  AbortCardInput,
  AcknowledgeUiCommandInput,
  AttachAgentSessionInput,
  CompleteCardInput,
  CreateBoardInput,
  CreateBoardResult,
  CreateCardInput,
  CreateCardResult,
  CreateProjectInput,
  CreateProjectResult,
  EnqueueVoiceNotificationInput,
  FailCardInput,
  LinkDependencyInput,
  LinkDependencyResult,
  QueueCardInput,
  RecordAgentEventInput,
  RecordPolicyDecisionInput,
  RedirectCardInput,
  RequestApprovalInput,
  RequestApprovalResult,
  ResolveApprovalInput,
  TriggerDownstreamCardsInput,
} from "./inputs";
import type { ReducerWrapper } from "./types";

export interface ChorusReducers {
  abortCard: ReducerWrapper<AbortCardInput, void>;
  acknowledgeUiCommand: ReducerWrapper<AcknowledgeUiCommandInput, void>;
  attachAgentSession: ReducerWrapper<AttachAgentSessionInput, void>;
  completeCard: ReducerWrapper<CompleteCardInput, void>;
  createBoard: ReducerWrapper<CreateBoardInput, CreateBoardResult>;
  createCard: ReducerWrapper<CreateCardInput, CreateCardResult>;
  createProject: ReducerWrapper<CreateProjectInput, CreateProjectResult>;
  enqueueVoiceNotification: ReducerWrapper<EnqueueVoiceNotificationInput, void>;
  failCard: ReducerWrapper<FailCardInput, void>;
  linkDependency: ReducerWrapper<LinkDependencyInput, LinkDependencyResult>;
  queueCard: ReducerWrapper<QueueCardInput, void>;
  recordAgentEvent: ReducerWrapper<RecordAgentEventInput, void>;
  recordPolicyDecision: ReducerWrapper<RecordPolicyDecisionInput, void>;
  redirectCard: ReducerWrapper<RedirectCardInput, void>;
  requestApproval: ReducerWrapper<RequestApprovalInput, RequestApprovalResult>;
  resolveApproval: ReducerWrapper<ResolveApprovalInput, void>;
  triggerDownstreamCards: ReducerWrapper<TriggerDownstreamCardsInput, void>;
}

export function createNoOpChorusReducers(): ChorusReducers {
  return {
    createProject: stub("createProject"),
    createBoard: stub("createBoard"),
    createCard: stub("createCard"),
    queueCard: stub("queueCard"),
    attachAgentSession: stub("attachAgentSession"),
    recordAgentEvent: stub("recordAgentEvent"),
    recordPolicyDecision: stub("recordPolicyDecision"),
    requestApproval: stub("requestApproval"),
    resolveApproval: stub("resolveApproval"),
    completeCard: stub("completeCard"),
    failCard: stub("failCard"),
    abortCard: stub("abortCard"),
    redirectCard: stub("redirectCard"),
    linkDependency: stub("linkDependency"),
    triggerDownstreamCards: stub("triggerDownstreamCards"),
    enqueueVoiceNotification: stub("enqueueVoiceNotification"),
    acknowledgeUiCommand: stub("acknowledgeUiCommand"),
  };
}

function stub<TInput, TResult = void>(
  name: string
): ReducerWrapper<TInput, TResult> {
  const fn = (_input: TInput): Promise<TResult> => {
    return Promise.reject(
      new Error(
        `Reducer "${name}" not connected. Register a SpacetimeDB module with registerSpacetimeModule().`
      )
    );
  };

  (fn as ReducerWrapper<TInput, TResult>).setFlags = () => {
    throw new Error(`Reducer "${name}" not connected`);
  };

  (fn as ReducerWrapper<TInput, TResult>).onCall = (
    _cb: (ctx: import("./types").ReducerEventContext, input: TInput) => void
  ) => {
    return () => {
      // no-op unsubscribe for stub reducer
    };
  };

  return fn as ReducerWrapper<TInput, TResult>;
}

export type {
  ReducerCallOptions,
  ReducerEventContext,
  ReducerWrapper,
} from "./types";
