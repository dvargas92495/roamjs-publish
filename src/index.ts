import { getInput, info, setFailed } from "@actions/core";
import axios from "axios";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";

type Credentials = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
};

const runAll = (): Promise<number> => {
  const Authorization = getInput("token");
  const sourcePath = path.join(
    process.env.GITHUB_WORKSPACE || path.join(__dirname, ".."),
    getInput("source")
  );
  info(`Source Path: ${sourcePath}`);
  const fileNames = fs.readdirSync(sourcePath);
  if (fileNames.length > 100) {
    return Promise.reject(
      new Error(`Attempting to upload too many files from ${sourcePath}. Max: 100, Actual: ${fileNames.length}`)
    );
  }
  const destPath = getInput("path");
  return axios
    .post<{ credentials: Credentials; distributionId: string }>(
      "https://api.roamjs.com/publish",
      {},
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
      return Promise.all(
        fileNames.map((p) =>
          s3
            .upload({
              Bucket: "roamjs.com",
              Key: `${destPath}/${p}`,
              Body: fs.createReadStream(path.join(sourcePath, p)),
            })
            .promise()
            .then(() => `/${destPath}/${p}`)
        )
      ).then((Items) =>
        cloudfront.createInvalidation({
          DistributionId: r.data.distributionId,
          InvalidationBatch: {
            CallerReference: new Date().toJSON(),
            Paths: {
              Quantity: Items.length,
              Items,
            },
          },
        }).promise().then(() => Items.length)
      );
    })
};

if (process.env.NODE_ENV !== "test") {
  runAll()
    .then((n) => info(`Successfully uploaded ${n} files.`))
    .catch((e) => setFailed(e.response?.data || e.message));
}

export default runAll;
