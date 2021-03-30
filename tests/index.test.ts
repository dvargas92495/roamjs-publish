import runall from "../src";
import dotenv from "dotenv";
dotenv.config();
test("runall", (done) => {
  jest.setTimeout(10000);
  runall()
    .then((r) => {
      expect(r).toBe(2);
    })
    .catch((e) => fail(e.response?.data || e.message || e))
    .finally(done);
});
