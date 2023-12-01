export const AGENT_RUN_ERROR = (agentId: string) => `agent:${agentId}:run:error`
export const AGENT_RUN_RESULT = (agentId: string) =>
  `agent:${agentId}:run:result`
export const AGENT_SPELL = (agentId: string) => `agent:${agentId}:event:spell`
export const AGENT_LOG = (agentId: string) => `agent:${agentId}:event:log`
export const AGENT_WARN = (agentId: string) => `agent:${agentId}:event:warn`
export const AGENT_ERROR = (agentId: string) => `agent:${agentId}:event:error`
export const AGENT_COMMAND = (agentId: string) =>
  `agent:${agentId}:event:command`
export const AGENT_COMMAND_PROJECT = (projectId: string) =>
  `agent:${projectId}:command`
export const AGENT_DELETE = `agent:delete`

// This cant be hardcodded
export const AGENT_MESSAGE = (agentId: string) =>
  `agent:${agentId}:Core:messageReceived`
