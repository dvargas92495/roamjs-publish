import runall from "../src";
import dotenv from "dotenv";
dotenv.config();
test("runall", (done) => {
  runall()
    .then((r) => {
      console.log(r);
    })
    .catch((e) => fail(e.response?.data || e.message || e))
    .finally(done);
});
