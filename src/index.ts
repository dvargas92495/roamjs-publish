import { getInput } from "@actions/core";
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
  const fileNames = fs.readdirSync(sourcePath);
  console.log("filenames to upload", fileNames);
  const destPath = getInput("path");
  return axios
    .post<{ credentials: Credentials }>(
      "https://api.roamjs.com/publish",
      {},
      { headers: { Authorization } }
    )
    .then((r) => {
      const s3 = new AWS.S3({
        apiVersion: "2006-03-01",
        credentials: {
          accessKeyId: r.data.credentials.AccessKeyId,
          secretAccessKey: r.data.credentials.SecretAccessKey,
          sessionToken: r.data.credentials.SessionToken,
        },
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
        )
      );
    })
    .then((r) => r.length);
};

if (process.env.NODE_ENV !== "test") {
  runAll();
}

export default runAll;
