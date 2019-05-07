import { guest } from "../index";

describe("guest", () => {

  it("returns a promise when trying to connect", () => {
    expect(guest.connect()).toBeInstanceOf(Promise);
  });
});
