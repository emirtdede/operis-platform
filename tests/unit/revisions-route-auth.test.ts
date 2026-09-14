import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/src/app/api/listings/[id]/revisions/route";
import { ListingService } from "@/src/modules/listings/service";
import * as sessionModule from "@/src/modules/auth/session";

import type { SessionPayload } from "@/src/modules/auth/session";

type ListingRevisionsResult = Awaited<ReturnType<typeof ListingService.getListingRevisions>>;

describe("Listing Revisions API Route Authorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when listing ID is missing", async () => {
    const req = new Request("https://operis.com/api/listings//revisions");
    const res = await GET(req, { params: Promise.resolve({ id: "" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing listing ID");
  });

  it("allows unauthenticated viewer to view revisions of public active listing", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
    vi.spyOn(ListingService, "getListingRevisions").mockResolvedValue([
      {
        id: "rev-1",
        listingId: "listing-123",
        revisionNo: 1,
        editorUserId: "user-owner",
        createdAt: new Date(),
        snapshotJson: { title: "Original Title" },
      },
    ] as unknown as ListingRevisionsResult);

    const req = new Request("https://operis.com/api/listings/listing-123/revisions");
    const res = await GET(req, { params: Promise.resolve({ id: "listing-123" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revisions).toHaveLength(1);
    expect(ListingService.getListingRevisions).toHaveBeenCalledWith(null, "listing-123", undefined);
  });

  it("returns 401 for unauthenticated viewer when listing is private/draft", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
    vi.spyOn(ListingService, "getListingRevisions").mockRejectedValue(
      new Error("UNAUTHORIZED_LISTING_REVISIONS_VIEW")
    );

    const req = new Request("https://operis.com/api/listings/draft-listing/revisions");
    const res = await GET(req, { params: Promise.resolve({ id: "draft-listing" }) });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized to view revisions");
  });

  it("returns 403 for authenticated non-owner when listing is private/draft", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue({
      userId: "other-user",
      role: "USER",
    } as unknown as SessionPayload);
    vi.spyOn(ListingService, "getListingRevisions").mockRejectedValue(
      new Error("UNAUTHORIZED_LISTING_REVISIONS_VIEW")
    );

    const req = new Request("https://operis.com/api/listings/draft-listing/revisions");
    const res = await GET(req, { params: Promise.resolve({ id: "draft-listing" }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized to view revisions");
  });

  it("returns 404 when listing is not found", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
    vi.spyOn(ListingService, "getListingRevisions").mockRejectedValue(
      new Error("LISTING_NOT_FOUND")
    );

    const req = new Request("https://operis.com/api/listings/unknown-id/revisions");
    const res = await GET(req, { params: Promise.resolve({ id: "unknown-id" }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Listing not found");
  });
});
