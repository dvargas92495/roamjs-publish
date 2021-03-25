import { getInput } from "@actions/core";
import axios from "axios";

type Credentials = { AccessKeyId: string; SecretKey: string };

const runAll = (): Promise<Credentials> => {
  const Authorization = getInput("token");
  const path = getInput("path");
  return axios
    .post<{ credentials: Credentials }>(
      "https://api.roamjs.com/publish",
      { path },
      { headers: { Authorization } }
    )
    .then((r) => r.data.credentials);
};

if (process.env.NODE_ENV !== "test") {
  runAll();
}

export default runAll;
