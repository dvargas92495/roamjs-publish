import { error, getInput, info, setFailed, warning } from "@actions/core";
import axios from "axios";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { context, getOctokit } from "@actions/github";
import { PushEvent } from "@octokit/webhooks-types";

type Credentials = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
};

const EXCLUSIONS = new Set([
  ".git",
  ".github",
  ".replit",
  "LICENSE",
  "README.md",
]);

const readDir = (s: string): string[] =>
  fs
    .readdirSync(s, { withFileTypes: true })
    .filter((f) => !EXCLUSIONS.has(f.name.split("/").slice(-1)[0]))
    .flatMap((f) =>
      f.isDirectory() ? readDir(path.join(s, f.name)) : [path.join(s, f.name)]
    );

const toDoubleDigit = (n: number) => n.toString().padStart(2, "0");

const createGithubRelease = (tag_name: string): Promise<void> => {
  const token = getInput("release_token");
  if (token) {
    const { owner, repo } = context.repo;
    const { message } = (context.payload as PushEvent).head_commit || {
      message: "Commit Message Not Found",
    };
    const github = getOctokit(token);
    return github.repos
      .createRelease({
        owner,
        repo,
        tag_name,
        name: message.length > 50 ? `${message.substring(0, 47)}...` : message,
        body: message.length > 50 ? `...${message.substring(47)}` : "",
      })
      .then((r) =>
        info(
          `Successfully created github release for version ${r.data.tag_name}`
        )
      )
      .catch((e) => error(e));
  } else {
    warning("No release token set so no Github release created");
    return Promise.resolve();
  }
};

const runAll = (): Promise<void> => {
  const Authorization = getInput("token");
  const sourcePath = path.join(
    process.env.GITHUB_WORKSPACE || path.join(__dirname, ".."),
    getInput("source")
  );
  info(`Source Path: ${sourcePath}`);
  const fileNames = readDir(sourcePath);

  if (fileNames.length > 100) {
    return Promise.reject(
      new Error(
        `Attempting to upload too many files from ${sourcePath}. Max: 100, Actual: ${fileNames.length}`
      )
    );
  }
  const destPathInput = getInput("path");
  if (destPathInput.endsWith("/")) {
    warning("No need to put an ending slash on the `path` input");
  }
  const destPath = destPathInput.replace(/\/$/, "");
  info(
    `Preparing to publish ${fileNames.length} files to RoamJS destination ${destPath}`
  );
  return axios
    .post<{ credentials: Credentials; distributionId: string }>(
      "https://api.roamjs.com/publish",
      { path: destPath },
      { headers: { Authorization } }
    )
    .then((r) => {
      const credentials = {
        accessKeyId: r.data.credentials.AccessKeyId,
        secretAccessKey: r.data.credentials.SecretAccessKey,
        sessionToken: r.data.credentials.SessionToken,
      };
      const s3 = new AWS.S3({
        apiVersion: "2006-03-01",
        credentials,
      });
      const cloudfront = new AWS.CloudFront({
        apiVersion: "2020-05-31",
        credentials,
      });
      const waitForCloudfront = (props: {
        Id: string;
        DistributionId: string;
        trial?: number;
      }) =>
        new Promise<string>((resolve) => {
          const { trial = 0, ...args } = props;
          cloudfront
            .getInvalidation(args)
            .promise()
            .then((r) => r.Invalidation?.Status)
            .then((status) => {
              if (status === "Completed") {
                resolve("Done!");
              } else if (trial === 60) {
                resolve("Ran out of time waiting for cloudfront...");
              } else {
                setTimeout(
                  () => waitForCloudfront({ ...args, trial: trial + 1 }),
                  1000
                );
              }
            });
        });
      const today = new Date();
      const version = `${today.getFullYear()}-${toDoubleDigit(
        today.getMonth() + 1
      )}-${toDoubleDigit(today.getDate())}-${toDoubleDigit(
        today.getHours()
      )}-${toDoubleDigit(today.getMinutes())}`;
      return Promise.all(
        fileNames.flatMap((p) => {
          const fileName = p.substring(sourcePath.length);
          const Key = `${destPath}${fileName}`;
          const uploadProps = {
            Bucket: "roamjs.com",
            ContentType: mime.lookup(fileName) || undefined,
          };
          const Body = fs
            .readFileSync(p)
            .toString()
            .replace(/process\.env\.ROAMJS_VERSION/g, `"${version}"`);
          info(`Uploading version ${version} of ${p} to ${Key}...`);
          return [
            s3
              .upload({
                Key: `${destPath}/${version}${fileName}`,
                ...uploadProps,
                Body,
              })
              .promise(),
            s3
              .upload({
                Key,
                ...uploadProps,
                Body,
              })
              .promise(),
          ];
        })
      )
        .then(() =>
          cloudfront
            .createInvalidation({
              DistributionId: r.data.distributionId,
              InvalidationBatch: {
                CallerReference: today.toJSON(),
                Paths: {
                  Quantity: 2,
                  Items: [`/${destPath}/*`, `/${destPath}.js`],
                },
              },
            })
            .promise()
            .then((i) => ({
              Id: i.Invalidation?.Id || "",
              DistributionId: r.data.distributionId,
            }))
        )
        .then((cf) =>
          createGithubRelease(version)
            .then(() => waitForCloudfront(cf))
            .then((msg) => info(msg))
        );
    });
};

if (process.env.NODE_ENV !== "test") {
  runAll()
    .then((n) => info(`Successfully uploaded ${n} files.`))
    .catch((e) => setFailed(e.response?.data || e.message));
}

export default runAll;
