// v3.13 Team mode ko asli free brains se jorta hai (lib/providers.js wali pipeline) + fallback purana Agent Mode.
import { getProviders, callProvider, isCooling, sortProviders } from "../providers";
import { AGENTS } from "../agents";
import { runtimeTest } from "../runtime";
import { runAgent } from "./loop";
import { runTeam, makeAsker, isTeamTask } from "./team.js";

export async function runTeamMode({ project, task, images = [], emit, signal, options = {} }) {
  // Picture wala kaam ya chhota kaam: purana single Agent Mode (vision wahan hai).
  if (images.length) { emit({ type: "thought", text: "👥 Team mode picture nahi dekhta — is dafa single Agent Mode (vision ke sath)." }); return runAgent({ project, task, images, emit, signal }); }
  if (!isTeamTask(task)) { emit({ type: "thought", text: "👥 Chhota kaam hai — team ki zaroorat nahi, single Agent Mode chala raha hoon (free limit bachat)." }); return runAgent({ project, task, images, emit, signal }); }
  const providers = getProviders();
  const ask = makeAsker({ providers, call: (p, m) => callProvider(p, m, 180000), isCooling, sort: sortProviders, agents: AGENTS });
  return runTeam({ project, task, emit, signal, options, deps: { ask, runtimeTest, fallback: (a) => runAgent({ ...a, images: [] }) } });
}
