/** biome-ignore-all lint/suspicious/noExplicitAny: time goess brr */
import { schema, t, table } from "spacetimedb/server";

const agentOutput = table(
  { name: "agent_output", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    taskId: t.string().index("btree"),
    sessionId: t.string().index("btree"),
    chunk: t.string(),
    outputType: t.string(),
    timestamp: t.u64(),
  }
);

const agentPrompt = table(
  { name: "agent_prompt", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    taskId: t.string().index("btree"),
    sessionId: t.string().index("btree"),
    text: t.string(),
    timestamp: t.u64(),
    source: t.string(),
    consumed: t.bool().index("btree"),
  }
);

const spacetimedb = schema({
  agent_output: agentOutput,
  agent_prompt: agentPrompt,
});
export default spacetimedb;

export const record_agent_output = spacetimedb.reducer(
  {
    taskId: t.string(),
    sessionId: t.string(),
    chunk: t.string(),
    outputType: t.string(),
  },
  (
    ctx: any,
    {
      taskId,
      sessionId,
      chunk,
      outputType,
    }: { taskId: string; sessionId: string; chunk: string; outputType: string }
  ) => {
    ctx.db.agent_output.insert({
      id: 0n,
      taskId,
      sessionId,
      chunk,
      outputType,
      timestamp: BigInt(Date.now()),
    });
  }
);

export const send_mobile_prompt = spacetimedb.reducer(
  {
    taskId: t.string(),
    sessionId: t.string(),
    text: t.string(),
  },
  (
    ctx: any,
    {
      taskId,
      sessionId,
      text,
    }: { taskId: string; sessionId: string; text: string }
  ) => {
    ctx.db.agent_prompt.insert({
      id: 0n,
      taskId,
      sessionId,
      text,
      timestamp: BigInt(Date.now()),
      source: "mobile",
      consumed: false,
    });
  }
);

export const consume_mobile_prompt = spacetimedb.reducer(
  { promptId: t.u64() },
  (ctx: any, { promptId }: { promptId: bigint }) => {
    const prompt = ctx.db.agent_prompt.id.find(promptId);
    if (prompt) {
      ctx.db.agent_prompt.id.update({
        ...prompt,
        consumed: true,
      });
    }
  }
);
