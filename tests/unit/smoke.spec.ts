import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";

describe("smoke", () => {
  it("mounts a trivial component inside the Nuxt test environment", async () => {
    const TrivialComponent = defineComponent({
      setup: () => () => h("p", "Read TES"),
    });

    const wrapper = await mountSuspended(TrivialComponent);

    expect(wrapper.text()).toBe("Read TES");
  });
});
