import { describe, it, expect } from "vitest";
import { buildQueryString } from "@/services/reportService";

describe("buildQueryString", () => {
    it("should include false values", () => {
         const qs = buildQueryString({ is_active: false });
         expect(qs).toBe("?is_active=false");
    });

    it("should include 0 values", () => {
         const qs = buildQueryString({ count: 0 });
         expect(qs).toBe("?count=0");
    });

    it("should append standard strings", () => {
         const qs = buildQueryString({ name: "test-query" });
         expect(qs).toBe("?name=test-query");
    });

    it("should omit undefined and empty strings", () => {
         const qs = buildQueryString({ name: "", other: undefined, ok: "yes" });
         expect(qs).toBe("?ok=yes");
    });

    it("should return empty if no filters passes", () => {
         const qs = buildQueryString({});
         expect(qs).toBe("");
    });
});
