import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClerkSyncService } from "@/src/modules/auth/clerk-sync-service";
import * as dbModule from "@/src/lib/db";

describe("ClerkSyncService Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully synchronizes a new user from Clerk with KVKK identity and legal acceptances", async () => {
    const mockInsertUsers = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "test-uuid-1234" }]),
      }),
    });

    const mockInsertGeneral = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: "test-id" }]),
    });

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing user by clerkUserId or email
          }),
        }),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No handle collision or existing identity
        }),
      }),
    });

    const mockDb = {
      select: mockSelect,
      insert: (table: unknown) => {
        if (table === dbModule.schema.users) return mockInsertUsers();
        return mockInsertGeneral();
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    vi.spyOn(dbModule, "getDb").mockReturnValue(
      mockDb as unknown as ReturnType<typeof dbModule.getDb>
    );

    const result = await ClerkSyncService.syncClerkUser({
      clerkUserId: "user_2test123",
      email: "engineer@operis.pro",
      firstName: "Ahmet",
      lastName: "Yılmaz",
      avatarUrl: "https://images.clerk.dev/avatar.png",
      emailVerified: true,
    });

    expect(result.userId).toBe("test-uuid-1234");
    expect(result.isNewUser).toBe(true);
    expect(result.displayName).toBe("Ahmet Yılmaz");
    expect(result.email).toBe("engineer@operis.pro");
    expect(result.handle).toBe("ahmet");
  });

  it("links existing user by email and self-heals missing userPrivateIdentity", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "existing-uuid" }]),
      }),
    });

    const mockInsertGeneral = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: "test-id" }]),
    });

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([]) // Not found by clerkUserId
              .mockResolvedValueOnce([
                {
                  user: {
                    id: "existing-uuid",
                    email: "developer@operis.pro",
                    emailVerified: true,
                    emailEnc: null,
                    emailHmac: null,
                  },
                  profile: {
                    displayName: "Senior Dev",
                    handle: "seniordev",
                    avatarUrl: null,
                  },
                },
              ]), // Found by email
          }),
        }),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No existing userPrivateIdentity -> triggers self-healing insert
        }),
      }),
    });

    const mockDb = {
      select: mockSelect,
      update: mockUpdate,
      insert: () => mockInsertGeneral(),
    };

    vi.spyOn(dbModule, "getDb").mockReturnValue(
      mockDb as unknown as ReturnType<typeof dbModule.getDb>
    );

    const result = await ClerkSyncService.syncClerkUser({
      clerkUserId: "user_2google999",
      email: "developer@operis.pro",
      firstName: "Senior",
      lastName: "Dev",
      avatarUrl: "https://lh3.googleusercontent.com/photo.jpg",
      emailVerified: true,
    });

    expect(result.userId).toBe("existing-uuid");
    expect(result.isNewUser).toBe(false);
    expect(result.handle).toBe("seniordev");
    expect(result.email).toBe("developer@operis.pro");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("soft deletes a user when clerk user is deleted", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "user-to-delete" }]),
      }),
    });

    const mockDb = {
      update: mockUpdate,
    };

    vi.spyOn(dbModule, "getDb").mockReturnValue(
      mockDb as unknown as ReturnType<typeof dbModule.getDb>
    );

    await ClerkSyncService.deleteClerkUser("user_to_delete_clerk");

    expect(mockUpdate).toHaveBeenCalledWith(dbModule.schema.users);
  });
});
