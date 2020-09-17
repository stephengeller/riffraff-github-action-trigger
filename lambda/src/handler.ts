import { Octokit } from "@octokit/rest";
import { APIGatewayEvent } from "aws-lambda";
import * as I from "./interfaces";
import { lambdaResponse } from "./utils";

const GITHUB_OWNER = "guardian";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface RiffRaffHook {
  vcsRevision?: string;
  vcsRepo?: string;
  vcsUrl?: string;
  branch?: string;
}

const handler = async (event: APIGatewayEvent): Promise<I.LambdaResponse> => {
  if (!event.body) {
    throw new Error("No body present");
  }

  try {
    const payload: RiffRaffHook = JSON.parse(event.body);
    console.log("payload from RiffRaff:", payload);
    const { vcsRevision, vcsUrl } = payload;
    if (!vcsRevision || !vcsUrl) {
      throw new Error("No VCS revision and/or URL in payload, aborting");
    }

    const arr = vcsUrl.split("/");
    const repo = arr[arr.length - 1];
    console.log(
      `Sending workflow dispatch to ${repo} for revision ${vcsRevision}`
    );

    const response = await octokit.repos
      .createDispatchEvent({
        owner: GITHUB_OWNER,
        repo: repo,
        event_type: "riffraff",
        client_payload: { ref: vcsRevision }
      })
      .catch(err => {
        console.error("Octokit error:", err.message, err.status);
        throw new Error(`Octokit error: ${err.message}`);
      });

    const { status, url, data } = response;
    console.log(`Workflow dispatch status ${status} for URL ${url}`);
    return lambdaResponse(status, JSON.stringify({ ...data, url, status }));
  } catch (e) {
    console.error("ERROR: ", e);
    return lambdaResponse(200, `Failed to handle payload: ${e.message}`);
  }
};

export { handler };
