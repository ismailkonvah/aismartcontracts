export interface SampleContract {
  name: string;
  description: string;
  code: string;
}

export const vulnerableResolverContract = `# { "Depends": "py-genlayer:test" }
from genlayer import *


class NewsResolutionContract(gl.Contract):
    owner: str
    latest_decision: str

    def __init__(self, owner: str):
        self.owner = owner
        self.latest_decision = "UNSET"

    @gl.public.write
    def resolve_claim(self, url: str, question: str):
        def leader():
            page = gl.nondet.web.get(url)
            prompt = f"""
            Read the webpage and decide whether this claim is true.
            Claim: {question}
            Page: {page.body}
            Give your answer in one paragraph.
            """
            return gl.nondet.exec_prompt(prompt)

        result = leader()
        self.latest_decision = result
`;

export const verifiedResolverContract = `# { "Depends": "py-genlayer:test" }
from genlayer import *
import json


class VerifiedNewsResolver(gl.Contract):
    owner: str
    latest_outcome: str
    latest_reasoning: str

    def __init__(self, owner: str):
        self.owner = owner
        self.latest_outcome = "PENDING"
        self.latest_reasoning = ""

    @gl.public.write
    def resolve_claim(self, caller: str, url: str, question: str):
        if caller != self.owner:
            raise Exception("Not authorized")

        def fetch_result():
            page = gl.nondet.web.get(url)
            prompt = f"""
            Review the source and answer the question.
            Question: {question}
            Page: {page.body}
            Return JSON with keys:
            {{
              "outcome": "TRUE, FALSE, or UNDETERMINED",
              "reasoning": "short explanation"
            }}
            """
            response = gl.nondet.exec_prompt(prompt)
            data = json.loads(response)
            return json.dumps({"outcome": data["outcome"]}, sort_keys=True)

        raw = gl.eq_principle.strict_eq(fetch_result)
        data = json.loads(raw)
        self.latest_outcome = data["outcome"]
        self.latest_reasoning = "Consensus-backed structured result recorded."

    @gl.public.view
    def get_status(self) -> str:
        return self.latest_outcome
`;

export const unsafeAutomationContract = `# { "Depends": "py-genlayer:test" }
from genlayer import *
import os


class UnsafeAutomationContract(gl.Contract):
    admin: str
    last_value: str

    def __init__(self, admin: str):
        self.admin = admin
        self.last_value = ""

    @gl.public.write
    def configure_source(self, user_input: str):
        command = "echo " + user_input
        self.last_value = str(eval(command))

    @gl.public.write
    def fetch_external_note(self, url: str):
        page = gl.nondet.web.get(url)
        self.last_value = page.body[:120]
`;

export const sampleContracts: SampleContract[] = [
  {
    name: 'Vulnerable Resolver',
    description: 'GenLayer contract that uses web data and prompts without equivalence-backed validation',
    code: vulnerableResolverContract,
  },
  {
    name: 'Verified Resolver',
    description: 'Safer GenLayer contract using structured output and strict equivalence',
    code: verifiedResolverContract,
  },
  {
    name: 'Unsafe Automation',
    description: 'GenLayer contract showing risky Python execution and weak operational controls',
    code: unsafeAutomationContract,
  },
];
